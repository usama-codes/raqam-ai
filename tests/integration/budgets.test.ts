// @vitest-environment edge-runtime
//
// convex/budgets.ts — create / upsertCategory / deleteCategory / getBudgetCategories.
// Budget utilization accuracy is AGENTS.md §12; the getBudgetCategories "[] for a
// missing budget" behaviour is the Phase 14 fix.

import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";
import {
  modules,
  seedUser,
  addTxn,
  monthStart,
  midMonth,
  SUBJECT_A,
  SUBJECT_B,
} from "./_helpers";

async function makeBudget(t: ReturnType<typeof convexTest>, subject: string) {
  const asUser = t.withIdentity({ subject });
  const budgetId = await asUser.mutation(api.budgets.create, {
    month: monthStart(0),
  });
  return { asUser, budgetId };
}

describe("budgets.create", () => {
  test("rejects a duplicate month and a non-positive total limit", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const { asUser } = await makeBudget(t, SUBJECT_A);

    await expect(
      asUser.mutation(api.budgets.create, { month: monthStart(0) }),
    ).rejects.toThrow(/already exists/);

    await expect(
      asUser.mutation(api.budgets.create, {
        month: monthStart(1),
        totalLimit: 0,
      }),
    ).rejects.toThrow(/greater than zero/);
  });
});

describe("budgets.upsertCategory", () => {
  test("inserts then updates in place, and validates ownership + limit", async () => {
    const t = convexTest(schema, modules);
    const { cat } = await seedUser(t);
    const { asUser, budgetId } = await makeBudget(t, SUBJECT_A);

    const first = await asUser.mutation(api.budgets.upsertCategory, {
      budgetId,
      categoryId: cat("food"),
      limit: 6000,
    });
    const second = await asUser.mutation(api.budgets.upsertCategory, {
      budgetId,
      categoryId: cat("food"),
      limit: 8000,
    });
    expect(second).toBe(first); // same row updated, not a new insert

    const rows = await asUser.query(api.budgets.getBudgetCategories, { budgetId });
    expect(rows).toHaveLength(1);
    expect(rows[0].limit).toBe(8000);

    await expect(
      asUser.mutation(api.budgets.upsertCategory, {
        budgetId,
        categoryId: cat("food"),
        limit: -1,
      }),
    ).rejects.toThrow(/greater than zero/);
  });

  test("rejects a budget or category owned by another user", async () => {
    const t = convexTest(schema, modules);
    const a = await seedUser(t, SUBJECT_A);
    const b = await seedUser(t, SUBJECT_B);
    const { budgetId: aBudget } = await makeBudget(t, SUBJECT_A);
    const { asUser: asB, budgetId: bBudget } = await makeBudget(t, SUBJECT_B);
    const asA = t.withIdentity({ subject: SUBJECT_A });

    // B writing into A's budget → rejected at the budget-ownership check.
    await expect(
      asB.mutation(api.budgets.upsertCategory, {
        budgetId: aBudget,
        categoryId: b.cat("food"),
        limit: 1000,
      }),
    ).rejects.toThrow(/Budget not found/);

    // A writing into B's budget → same.
    await expect(
      asA.mutation(api.budgets.upsertCategory, {
        budgetId: bBudget,
        categoryId: a.cat("food"),
        limit: 1000,
      }),
    ).rejects.toThrow(/Budget not found/);
  });
});

describe("budgets.getBudgetCategories", () => {
  test("sums spent from expense transactions inside the budget month only", async () => {
    const t = convexTest(schema, modules);
    const { userId, cat } = await seedUser(t);
    const { asUser, budgetId } = await makeBudget(t, SUBJECT_A);
    await asUser.mutation(api.budgets.upsertCategory, {
      budgetId,
      categoryId: cat("food"),
      limit: 6000,
    });

    await addTxn(t, userId, cat("food"), "expense", 2000, midMonth(0));
    await addTxn(t, userId, cat("food"), "expense", 1500, midMonth(0));
    await addTxn(t, userId, cat("food"), "expense", 999, midMonth(-1)); // prior month
    await addTxn(t, userId, cat("food"), "income", 5000, midMonth(0)); // not an expense

    const rows = await asUser.query(api.budgets.getBudgetCategories, { budgetId });
    expect(rows[0].spent).toBe(3500);
  });

  test("returns [] for a missing budget id instead of throwing (Phase 14 fix)", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const { asUser, budgetId } = await makeBudget(t, SUBJECT_A);

    // Delete the budget, then query with the now-stale id (reactive-race shape).
    await t.run((ctx) => ctx.db.delete(budgetId));
    const rows = await asUser.query(api.budgets.getBudgetCategories, { budgetId });
    expect(rows).toEqual([]);
  });

  test("returns [] for a budget owned by another user", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, SUBJECT_A);
    await seedUser(t, SUBJECT_B);
    const { budgetId: aBudget } = await makeBudget(t, SUBJECT_A);
    const asB = t.withIdentity({ subject: SUBJECT_B });

    expect(
      await asB.query(api.budgets.getBudgetCategories, { budgetId: aBudget }),
    ).toEqual([]);
  });
});

describe("budgets.deleteCategory", () => {
  test("only the owner can delete a budget category", async () => {
    const t = convexTest(schema, modules);
    const a = await seedUser(t, SUBJECT_A);
    await seedUser(t, SUBJECT_B);
    const { asUser: asA, budgetId } = await makeBudget(t, SUBJECT_A);
    const bcId = await asA.mutation(api.budgets.upsertCategory, {
      budgetId,
      categoryId: a.cat("food"),
      limit: 6000,
    });

    const asB = t.withIdentity({ subject: SUBJECT_B });
    await expect(
      asB.mutation(api.budgets.deleteCategory, { id: bcId }),
    ).rejects.toThrow(/does not belong/);

    await asA.mutation(api.budgets.deleteCategory, { id: bcId });
    expect(
      await asA.query(api.budgets.getBudgetCategories, { budgetId }),
    ).toEqual([]);
  });
});
