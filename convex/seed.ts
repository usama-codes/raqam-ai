// convex/seed.ts — Local demo-data helpers. NOT used by the app.
//
// Run from the CLI against a deployment, e.g. (Windows: use Git Bash — PowerShell
// mangles the JSON quotes):
//   npx convex run seed:demo '{"email":"you@example.com"}'
//
// `demo` wipes the target user's finance data and seeds a realistic ~3-month
// history for a live judging walkthrough (Phase 15). It is a superset of the old
// `proactiveDemo` — it still triggers every Phase 13 proactive surface (budget
// warning, unusual spending, a bill due tomorrow, the monthly summary) AND fills
// the dashboard, budgets, goals, and assistant history. Safe to re-run.
//
// `clearDemo` undoes it (clears the seeded finance data for the email).

import { mutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const DAY = 24 * 60 * 60 * 1000;

function monthStart(delta: number): number {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth() + delta, 1).getTime();
}
/**
 * A day `d` (1-based) of the month `delta` away from the current one. For the
 * current month (`delta === 0`) the day is clamped to today so the demo never
 * seeds future-dated transactions regardless of when it runs.
 */
function dayOfMonth(delta: number, d: number): number {
  const n = new Date();
  const day = delta === 0 ? Math.min(d, n.getDate()) : d;
  return new Date(n.getFullYear(), n.getMonth() + delta, day).getTime();
}

async function wipeUserFinance(ctx: MutationCtx, userId: Id<"users">) {
  // Tables with a plain `by_userId` index.
  const byUserId = [
    "transactions",
    "budgetCategories",
    "recurringExpenses",
    "dismissedAlerts",
    "savingsGoals",
    "auditLog",
  ] as const;
  for (const table of byUserId) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
  }

  // Conversations + their messages (messages are indexed by conversation only).
  const conversations = await ctx.db
    .query("conversations")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const conv of conversations) {
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", conv._id))
      .collect();
    for (const m of msgs) await ctx.db.delete(m._id);
    await ctx.db.delete(conv._id);
  }
  // Any pending actions tied to those conversations.
  const pending = await ctx.db
    .query("pendingActions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const p of pending) await ctx.db.delete(p._id);
  // NOTE: budget *rows* are intentionally NOT deleted here. A live reactive
  // `budgets.getBudgetCategories(budgetId)` on an open Budgets page throws if the
  // budget id it is holding vanishes mid-session. `demo` reuses the
  // current-month budget instead (find-or-create).
  await ctx.db.patch(userId, { lastSummaryDismissedMonth: undefined });
}

/** Find the current-month budget for a user, creating it if absent. */
async function ensureCurrentMonthBudget(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<Id<"budgets">> {
  const existing = await ctx.db
    .query("budgets")
    .withIndex("by_userId_month", (q) =>
      q.eq("userId", userId).eq("month", monthStart(0)),
    )
    .first();
  const stamp = Date.now();
  if (existing) {
    await ctx.db.patch(existing._id, { totalLimit: 70_000, updatedAt: stamp });
    return existing._id;
  }
  return ctx.db.insert("budgets", {
    userId,
    month: monthStart(0),
    totalLimit: 70_000,
    createdAt: stamp,
    updatedAt: stamp,
  });
}

// ─── Expense templates ─────────────────────────────────────────────────────────
// [category slug, amount, day-of-month, Urdu description]
type Row = [string, number, number, string];

// A month's worth of everyday spending. Food totals are tuned per-month below;
// utilities is deliberately low in the prior months so the current month reads
// as an anomaly.
const BASE_MONTH: Row[] = [
  ["transportation", 1200, 3, "پیٹرول"],
  ["transportation", 900, 17, "پیٹرول"],
  ["transportation", 450, 24, "رکشہ / کیرم"],
  ["shopping", 3200, 8, "کپڑے"],
  ["entertainment", 1500, 14, "سینما اور باہر کھانا"],
  ["health", 1800, 11, "دوائی اور ڈاکٹر"],
  ["phone", 1200, 2, "موبائل پیکج"],
  ["education", 2500, 6, "کورس فیس"],
];

function foodRows(total: number): Row[] {
  // Split a monthly food total across four grocery/eat-out entries.
  const parts = [0.4, 0.28, 0.2, 0.12].map((p) => Math.round(total * p));
  const days = [4, 12, 19, 26];
  const labels = ["مہینے کا راشن", "سبزی اور پھل", "باہر کھانا", "بیکری"];
  return parts.map((amt, i) => ["food", amt, days[i], labels[i]] as Row);
}

export const demo = mutation({
  args: { email: v.string() },
  handler: async (ctx: MutationCtx, args: { email: string }) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    if (!user) {
      throw new Error(
        `No user with email "${args.email}". Sign in once so the account is created, then re-run.`,
      );
    }
    const userId = user._id;

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const cat = (name: string): Id<"categories"> => {
      const c = categories.find((x) => x.name === name);
      if (!c) throw new Error(`Category "${name}" not found for this user.`);
      return c._id;
    };
    const stamp = Date.now();

    await wipeUserFinance(ctx, userId);

    const addTxn = (
      categoryId: Id<"categories">,
      type: "income" | "expense",
      amount: number,
      date: number,
      description: string,
    ) =>
      ctx.db.insert("transactions", {
        userId,
        type,
        amount,
        categoryId,
        date,
        description,
        source: "manual",
        isRecurring: false,
        pendingConfirmation: false,
        createdAt: stamp,
        updatedAt: stamp,
      });

    let txnCount = 0;
    const addRows = async (rows: Row[], delta: number) => {
      for (const [slug, amount, d, desc] of rows) {
        await addTxn(cat(slug), "expense", amount, dayOfMonth(delta, d), desc);
        txnCount++;
      }
    };

    // ── Income: salary for this and the two prior months ──────────────────
    for (const delta of [0, -1, -2]) {
      await addTxn(cat("salary"), "income", 85_000, dayOfMonth(delta, 1), "تنخواہ");
      txnCount++;
    }

    // ── Prior two months: steady spending, utilities LOW (anomaly baseline) ──
    for (const delta of [-1, -2]) {
      await addRows(BASE_MONTH, delta);
      await addRows(foodRows(14_000), delta);
      await addTxn(cat("utilities"), "expense", 5_000, dayOfMonth(delta, 9), "بجلی اور گیس");
      txnCount++;
    }
    // Month -3 gets just utilities so the 3-month rolling average has 3 points.
    await addTxn(cat("utilities"), "expense", 5_000, dayOfMonth(-3, 9), "بجلی اور گیس");
    txnCount++;

    // ── Current month: food near its budget limit, utilities spiked ────────
    await addRows(BASE_MONTH, 0);
    await addRows(foodRows(15_800), 0); // ~88% of the 18,000 food budget
    await addTxn(cat("utilities"), "expense", 8_000, dayOfMonth(0, 9), "بجلی کا زیادہ بل");
    txnCount++;

    // ── Budget: current month, food at ~88% ──────────────────────────────
    const budgetId = await ensureCurrentMonthBudget(ctx, userId);
    const limits: Array<[string, number]> = [
      ["food", 18_000],
      ["transportation", 4_000],
      ["utilities", 6_000],
      ["shopping", 5_000],
      ["entertainment", 3_000],
    ];
    for (const [slug, limit] of limits) {
      const existing = await ctx.db
        .query("budgetCategories")
        .withIndex("by_budgetId", (q) => q.eq("budgetId", budgetId))
        .filter((q) => q.eq(q.field("categoryId"), cat(slug)))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { limit, updatedAt: stamp });
      } else {
        await ctx.db.insert("budgetCategories", {
          budgetId,
          userId,
          categoryId: cat(slug),
          limit,
          createdAt: stamp,
          updatedAt: stamp,
        });
      }
    }

    // ── Savings goals ────────────────────────────────────────────────────
    await ctx.db.insert("savingsGoals", {
      userId,
      name: "Emergency Fund",
      nameUr: "ایمرجنسی فنڈ",
      targetAmount: 150_000,
      currentAmount: 90_000,
      isCompleted: false,
      createdAt: stamp,
      updatedAt: stamp,
    });
    await ctx.db.insert("savingsGoals", {
      userId,
      name: "Laptop",
      nameUr: "لیپ ٹاپ",
      targetAmount: 120_000,
      currentAmount: 114_000,
      isCompleted: false,
      createdAt: stamp,
      updatedAt: stamp,
    });

    // ── Recurring bills: one due tomorrow, one in ~5 days ────────────────
    await ctx.db.insert("recurringExpenses", {
      userId,
      categoryId: cat("utilities"),
      description: "بجلی کا بل",
      amount: 3_500,
      frequency: "monthly",
      nextDueDate: stamp + 1 * DAY,
      isActive: true,
      createdAt: stamp,
    });
    await ctx.db.insert("recurringExpenses", {
      userId,
      categoryId: cat("phone"),
      description: "انٹرنیٹ",
      amount: 3_000,
      frequency: "monthly",
      nextDueDate: stamp + 5 * DAY,
      isActive: true,
      createdAt: stamp,
    });

    // ── Past assistant conversations ────────────────────────────────────
    const conversation = async (
      title: string,
      pairs: Array<[string, "educate" | "analyze" | "act", string]>,
      ageDays: number,
    ) => {
      const created = stamp - ageDays * DAY;
      const convId = await ctx.db.insert("conversations", {
        userId,
        title,
        createdAt: created,
        updatedAt: created,
      });
      let ts = created;
      for (const [userMsg, intent, aiMsg] of pairs) {
        await ctx.db.insert("messages", {
          conversationId: convId,
          userId,
          role: "user",
          content: userMsg,
          inputMode: "text",
          createdAt: ts,
        });
        ts += 4000;
        await ctx.db.insert("messages", {
          conversationId: convId,
          userId,
          role: "assistant",
          content: aiMsg,
          intentType: intent,
          createdAt: ts,
        });
        ts += 1000;
      }
    };

    await conversation(
      "کمیٹی کیا ہوتی ہے؟",
      [
        [
          "committee kya hoti hai?",
          "educate",
          "کمیٹی ایک غیر رسمی بچت کا طریقہ ہے جس میں کچھ لوگ ہر مہینے ایک مقررہ رقم جمع کرتے ہیں اور باری باری پوری رقم ایک فرد کو ملتی ہے۔",
        ],
      ],
      9,
    );
    await conversation(
      "اس مہینے کے اخراجات",
      [
        [
          "is mahine kitna kharch hua?",
          "analyze",
          "آپ کے لین دین کے مطابق اس مہینے اب تک تقریباً Rs. 41,000 خرچ ہو چکے ہیں — سب سے زیادہ کھانے (Rs. 15,800) اور یوٹیلٹیز (Rs. 8,000) پر۔",
        ],
        [
          "kya main 20000 ka phone le sakta hoon?",
          "analyze",
          "اس مہینے آپ کی بچت کی گنجائش محدود ہے۔ اگر آپ Rs. 20,000 کا فون لیں تو مہینے کے آخر تک تخمیناً Rs. 4,000 بچیں گے — ممکن ہے مگر تنگی رہے گی۔",
        ],
      ],
      4,
    );
    await conversation(
      "پیٹرول کا خرچہ",
      [
        [
          "500 ka petrol add karo",
          "act",
          "Rs. 500 کا پیٹرول (نقل و حمل) شامل کر دیا گیا۔",
        ],
      ],
      1,
    );

    // ── Skip onboarding for the demo login ──────────────────────────────
    await ctx.db.patch(userId, { onboardingCompletedAt: stamp });

    return {
      seededFor: args.email,
      transactions: txnCount,
      expect: [
        "Dashboard: income 85,000 · ~40 transactions · category chart",
        "Budget warning card: food ~88% of 18,000",
        "Unusual spending card: utilities +60% vs 3-month average",
        "Bill reminder: بجلی کا بل due tomorrow",
        "Monthly summary card for last month",
        "Goals: ایمرجنسی فنڈ 60% · لیپ ٹاپ 95%",
        "Assistant: 3 past conversations",
      ],
    };
  },
});

/** Undo demo — clears the seeded finance data for the given email. */
export const clearDemo = mutation({
  args: { email: v.string() },
  handler: async (ctx: MutationCtx, args: { email: string }) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
    if (!user) throw new Error(`No user with email "${args.email}".`);
    await wipeUserFinance(ctx, user._id);
    return { cleared: args.email };
  },
});
