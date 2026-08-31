// @vitest-environment edge-runtime
//
// Phase 13 exit gate, run headlessly against convex-test's in-memory backend:
// budget-threshold alerts, unusual-spending alerts (with noise guards), recurring
// bill reminders + markPaid, and the monthly summary — including dismissal.
// No Convex deployment, no Clerk. Seeds AGENTS.md Phase 14 (Convex integration).

import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";
import type { Id } from "@/convex/_generated/dataModel";

// All Convex function modules except the "use node" action file (convex-test
// runs in the edge runtime and cannot load node actions).
const modules = import.meta.glob(
  ["../../convex/**/*.ts", "!../../convex/ai.ts"],
  { eager: false },
);

const DAY = 24 * 60 * 60 * 1000;
const SUBJECT = "clerk|test-user";

const now = new Date();
const curMonthStart = new Date(
  now.getFullYear(),
  now.getMonth(),
  1,
).getTime();
const monthStart = (delta: number) =>
  new Date(now.getFullYear(), now.getMonth() + delta, 1).getTime();
// A safe mid-month timestamp for a month `delta` away from the current one.
const midMonth = (delta: number) => monthStart(delta) + 12 * DAY;

interface Seeded {
  userId: Id<"users">;
  cat: (name: string) => Id<"categories">;
}

async function seedUser(
  t: ReturnType<typeof convexTest>,
): Promise<Seeded> {
  const catIds: Record<string, Id<"categories">> = {};
  const userId = await t.run(async (ctx) => {
    const uid = await ctx.db.insert("users", {
      clerkId: SUBJECT,
      email: "test@example.com",
      preferredLanguage: "ur",
      currency: "PKR",
      createdAt: now.getTime(),
    });
    for (const [name, nameUr, icon] of [
      ["food", "کھانا", "🍔"],
      ["transportation", "نقل و حمل", "🚗"],
      ["utilities", "یوٹیلٹیز", "💡"],
      ["salary", "تنخواہ", "💰"],
    ] as const) {
      catIds[name] = await ctx.db.insert("categories", {
        userId: uid,
        name,
        nameUr,
        icon,
        color: "#000",
        type: name === "salary" ? "income" : "expense",
        isSystem: true,
        createdAt: now.getTime(),
      });
    }
    return uid;
  });
  return { userId, cat: (n) => catIds[n] };
}

async function addTxn(
  t: ReturnType<typeof convexTest>,
  userId: Id<"users">,
  categoryId: Id<"categories">,
  type: "income" | "expense",
  amount: number,
  date: number,
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("transactions", {
      userId,
      type,
      amount,
      categoryId,
      date,
      source: "manual",
      isRecurring: false,
      pendingConfirmation: false,
      createdAt: date,
      updatedAt: date,
    });
  });
}

// ─── Budget threshold alerts ───────────────────────────────────────────────────

describe("proactive.getAlerts — budget thresholds", () => {
  test("warns at 80% and escalates to 'over' at 100%", async () => {
    const t = convexTest(schema, modules);
    const { userId, cat } = await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT });

    // Budget: food limit 1,000 for the current month.
    const budgetId = await t.run(async (ctx) => {
      const b = await ctx.db.insert("budgets", {
        userId,
        month: curMonthStart,
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
      });
      await ctx.db.insert("budgetCategories", {
        budgetId: b,
        userId,
        categoryId: cat("food"),
        limit: 1000,
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
      });
      return b;
    });
    expect(budgetId).toBeTruthy();

    await addTxn(t, userId, cat("food"), "expense", 850, midMonth(0));
    let res = await asUser.query(api.proactive.getAlerts, {});
    expect(res.budgetAlerts).toHaveLength(1);
    expect(res.budgetAlerts[0].severity).toBe("warning");
    expect(res.budgetAlerts[0].pct).toBe(85);

    await addTxn(t, userId, cat("food"), "expense", 200, midMonth(0));
    res = await asUser.query(api.proactive.getAlerts, {});
    expect(res.budgetAlerts).toHaveLength(1);
    expect(res.budgetAlerts[0].severity).toBe("over");
    expect(res.budgetAlerts[0].pct).toBe(105);
  });

  test("respects dismissal (per period) and the budget80 preference", async () => {
    const t = convexTest(schema, modules);
    const { userId, cat } = await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT });

    const budgetId = await t.run(async (ctx) =>
      ctx.db.insert("budgets", {
        userId,
        month: curMonthStart,
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
      }),
    );
    const addBudgetCat = (categoryId: Id<"categories">) =>
      t.run(async (ctx) => {
        await ctx.db.insert("budgetCategories", {
          budgetId,
          userId,
          categoryId,
          limit: 1000,
          createdAt: now.getTime(),
          updatedAt: now.getTime(),
        });
      });

    await addBudgetCat(cat("food"));
    await addTxn(t, userId, cat("food"), "expense", 900, midMonth(0));

    // Dismiss → gone.
    const first = await asUser.query(api.proactive.getAlerts, {});
    expect(first.budgetAlerts).toHaveLength(1);
    const a = first.budgetAlerts[0];
    await asUser.mutation(api.proactive.dismissAlert, {
      alertKey: a.alertKey,
      periodKey: a.periodKey,
    });
    expect(
      (await asUser.query(api.proactive.getAlerts, {})).budgetAlerts,
    ).toHaveLength(0);

    // Turn budget80 off → a fresh (undismissed) 90% category still produces nothing.
    await asUser.mutation(api.users.updateNotificationPrefs, {
      prefs: {
        budget80: false,
        budget100: true,
        billReminder: true,
        unusualSpend: true,
        monthlySummary: true,
      },
    });
    await addBudgetCat(cat("transportation"));
    await addTxn(t, userId, cat("transportation"), "expense", 900, midMonth(0));
    expect(
      (await asUser.query(api.proactive.getAlerts, {})).budgetAlerts,
    ).toHaveLength(0);
  });
});

// ─── Unusual spending ──────────────────────────────────────────────────────────

describe("proactive.getAlerts — unusual spending", () => {
  test("flags a real overspend with 3 months of history, ignores a spike with none", async () => {
    const t = convexTest(schema, modules);
    const { userId, cat } = await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT });

    // food: Rs 5,000 in each of the last 3 months → avg 5,000, monthsWithSpend 3.
    for (const d of [-1, -2, -3]) {
      await addTxn(t, userId, cat("food"), "expense", 5000, midMonth(d));
    }
    // Current month: Rs 7,000 → +40%, overspend 2,000.
    await addTxn(t, userId, cat("food"), "expense", 7000, midMonth(0));

    // utilities: only this month, Rs 9,000 (a spike but no history).
    await addTxn(t, userId, cat("utilities"), "expense", 9000, midMonth(0));

    const res = await asUser.query(api.proactive.getAlerts, {});
    expect(res.unusualAlerts).toHaveLength(1);
    expect(res.unusualAlerts[0].categoryName).toBe("food");
    expect(res.unusualAlerts[0].deviationPercent).toBe(40);
  });
});

// ─── Recurring bill reminders + markPaid ───────────────────────────────────────

describe("recurring bills", () => {
  test("a bill due tomorrow shows a reminder; markPaid advances the date and logs the expense", async () => {
    const t = convexTest(schema, modules);
    const { cat } = await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT });

    const dueDate = midMonth(0); // safely inside the current month
    const billId = await asUser.mutation(api.recurring.create, {
      categoryId: cat("utilities"),
      description: "بجلی کا بل",
      amount: 3500,
      frequency: "monthly",
      nextDueDate: dueDate,
    });

    // Force it to be "due soon" regardless of today's date.
    await t.run(async (ctx) => {
      await ctx.db.patch(billId, { nextDueDate: Date.now() + 1 * DAY });
    });

    let res = await asUser.query(api.proactive.getAlerts, {});
    expect(res.billReminders).toHaveLength(1);
    expect(res.billReminders[0].overdue).toBe(false);
    expect(res.billReminders[0].daysUntilDue).toBeLessThanOrEqual(1);

    const before = await t.run(async (ctx) => ctx.db.get(billId));
    await asUser.mutation(api.recurring.markPaid, {
      id: billId,
      logExpense: true,
    });
    const after = await t.run(async (ctx) => ctx.db.get(billId));
    expect(after!.nextDueDate).toBeGreaterThan(before!.nextDueDate);

    // The expense was logged, linked back to the bill.
    const txns = await t.run(async (ctx) =>
      ctx.db
        .query("transactions")
        .filter((q) => q.eq(q.field("recurringExpenseId"), billId))
        .collect(),
    );
    expect(txns).toHaveLength(1);
    expect(txns[0].amount).toBe(3500);
    expect(txns[0].isRecurring).toBe(true);

    // Reminder clears for that cycle (new nextDueDate is > 3 days out).
    res = await asUser.query(api.proactive.getAlerts, {});
    expect(res.billReminders).toHaveLength(0);
  });

  test("an overdue bill is flagged as overdue", async () => {
    const t = convexTest(schema, modules);
    const { cat } = await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT });

    const billId = await asUser.mutation(api.recurring.create, {
      categoryId: cat("utilities"),
      description: "انٹرنیٹ",
      amount: 2500,
      frequency: "monthly",
      nextDueDate: midMonth(0),
    });
    await t.run(async (ctx) => {
      await ctx.db.patch(billId, { nextDueDate: Date.now() - 2 * DAY });
    });

    const res = await asUser.query(api.proactive.getAlerts, {});
    expect(res.billReminders).toHaveLength(1);
    expect(res.billReminders[0].overdue).toBe(true);
  });
});

// ─── Monthly summary ───────────────────────────────────────────────────────────

describe("proactive.getMonthlySummary", () => {
  test("shows last month's recap once, then hides after dismissal", async () => {
    const t = convexTest(schema, modules);
    const { userId, cat } = await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT });

    // Last month: income 100k, food 30k, transport 10k.
    await addTxn(t, userId, cat("salary"), "income", 100_000, midMonth(-1));
    await addTxn(t, userId, cat("food"), "expense", 30_000, midMonth(-1));
    await addTxn(
      t,
      userId,
      cat("transportation"),
      "expense",
      10_000,
      midMonth(-1),
    );
    // Month before: food 20k (for the delta).
    await addTxn(t, userId, cat("food"), "expense", 20_000, midMonth(-2));

    const shown = await asUser.query(api.proactive.getMonthlySummary, {});
    expect(shown.show).toBe(true);
    expect(shown.summary?.income).toBe(100_000);
    expect(shown.summary?.expenses).toBe(40_000);
    expect(shown.summary?.net).toBe(60_000);
    expect(shown.summary?.savingsRate).toBe(60);
    expect(shown.summary?.topCategories[0].name).toBe("food");
    // 40k this-prior vs 20k the month before → +100%.
    expect(shown.summary?.expenseDeltaPct).toBe(100);
    expect(shown.summary?.month).toBe(monthStart(-1));

    await asUser.mutation(api.proactive.dismissMonthlySummary, {});
    const hidden = await asUser.query(api.proactive.getMonthlySummary, {});
    expect(hidden.show).toBe(false);
  });

  test("does not show when last month had no data", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT });
    const res = await asUser.query(api.proactive.getMonthlySummary, {});
    expect(res.show).toBe(false);
  });
});
