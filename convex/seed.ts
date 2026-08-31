// convex/seed.ts — Local demo-data helpers. NOT used by the app.
//
// Run from the CLI against your dev deployment, e.g.:
//   npx convex run seed:proactiveDemo '{"email":"you@example.com"}'
//
// `proactiveDemo` wipes the target user's finance data and seeds a scenario that
// triggers every Phase 13 proactive surface (budget warning, unusual spending,
// a bill due tomorrow, and the monthly summary). Safe to re-run.

import { mutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

const DAY = 24 * 60 * 60 * 1000;

function monthStart(delta: number): number {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth() + delta, 1).getTime();
}
function midMonth(delta: number): number {
  return monthStart(delta) + 12 * DAY;
}

async function wipeUserFinance(ctx: MutationCtx, userId: Id<"users">) {
  // Tables with a plain `by_userId` index.
  const byUserId = [
    "transactions",
    "budgetCategories",
    "recurringExpenses",
    "dismissedAlerts",
  ] as const;
  for (const table of byUserId) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
  }
  // NOTE: budget *rows* are intentionally NOT deleted here. A live reactive
  // `budgets.getBudgetCategories(budgetId)` on an open Budgets page throws if the
  // budget id it is holding vanishes mid-session. `proactiveDemo` reuses the
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
  if (existing) return existing._id;
  const stamp = Date.now();
  return ctx.db.insert("budgets", {
    userId,
    month: monthStart(0),
    createdAt: stamp,
    updatedAt: stamp,
  });
}

export const proactiveDemo = mutation({
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

    // ── Budget warning: food at ~87% of a 6,000 limit ──────────────────────
    const budgetId = await ensureCurrentMonthBudget(ctx, userId);
    await ctx.db.insert("budgetCategories", {
      budgetId,
      userId,
      categoryId: cat("food"),
      limit: 6000,
      createdAt: stamp,
      updatedAt: stamp,
    });
    await addTxn(cat("food"), "expense", 5200, midMonth(0), "کھانے پر خرچ");

    // ── Unusual spending: utilities 60% over its 3-month average ───────────
    for (const d of [-1, -2, -3]) {
      await addTxn(cat("utilities"), "expense", 2500, midMonth(d), "بجلی/گیس");
    }
    await addTxn(cat("utilities"), "expense", 4000, midMonth(0), "بجلی/گیس");

    // ── Bill reminder: an electricity bill due tomorrow ───────────────────
    await ctx.db.insert("recurringExpenses", {
      userId,
      categoryId: cat("utilities"),
      description: "بجلی کا بل",
      amount: 3500,
      frequency: "monthly",
      nextDueDate: Date.now() + 1 * DAY,
      isActive: true,
      createdAt: stamp,
    });

    // ── Monthly summary: give last month (and the one before) real data ───
    await addTxn(cat("salary"), "income", 85_000, midMonth(-1), "تنخواہ");
    await addTxn(cat("food"), "expense", 15_000, midMonth(-1), "کھانا");
    await addTxn(cat("utilities"), "expense", 6_000, midMonth(-1), "یوٹیلٹی");
    await addTxn(cat("transportation"), "expense", 4_000, midMonth(-1), "پیٹرول");
    await addTxn(cat("food"), "expense", 11_000, midMonth(-2), "کھانا");

    return {
      seededFor: args.email,
      expect: [
        "Budget warning card: food ~87%",
        "Unusual spending card: utilities +60% vs 3-month average",
        "Bill reminder: بجلی کا بل due tomorrow",
        "Monthly summary card for last month (income 85,000)",
      ],
    };
  },
});

/** Undo proactiveDemo — clears the seeded finance data for the given email. */
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
