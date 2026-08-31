// @vitest-environment edge-runtime
//
// convex/transactions.ts — create / update / remove / list, run headlessly against
// convex-test's in-memory backend. Covers validation, ownership, the large-amount
// case (AGENTS.md §14), and cross-user isolation (AGENTS.md §12).

import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";
import {
  modules,
  seedUser,
  addTxn,
  midMonth,
  DAY,
  SUBJECT_A,
  SUBJECT_B,
} from "./_helpers";

describe("transactions.create", () => {
  test("creates a row for valid input and rejects a non-positive amount", async () => {
    const t = convexTest(schema, modules);
    const { cat } = await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });

    const id = await asUser.mutation(api.transactions.create, {
      type: "expense",
      amount: 850,
      categoryId: cat("food"),
      date: midMonth(0),
      description: "کھانا",
      source: "manual",
    });
    expect(id).toBeTruthy();

    await expect(
      asUser.mutation(api.transactions.create, {
        type: "expense",
        amount: 0,
        categoryId: cat("food"),
        date: midMonth(0),
        source: "manual",
      }),
    ).rejects.toThrow(/greater than zero/);
  });

  test("accepts a very large amount (Rs. 9,999,999)", async () => {
    const t = convexTest(schema, modules);
    const { cat } = await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });

    const id = await asUser.mutation(api.transactions.create, {
      type: "income",
      amount: 9_999_999,
      categoryId: cat("salary"),
      date: midMonth(0),
      source: "manual",
    });
    const row = await t.run((ctx) => ctx.db.get(id));
    expect(row?.amount).toBe(9_999_999);
  });

  test("rejects a category owned by another user", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, SUBJECT_A);
    const b = await seedUser(t, SUBJECT_B);
    const asA = t.withIdentity({ subject: SUBJECT_A });

    await expect(
      asA.mutation(api.transactions.create, {
        type: "expense",
        amount: 100,
        categoryId: b.cat("food"), // B's category
        date: midMonth(0),
        source: "manual",
      }),
    ).rejects.toThrow(/Category not found/);
  });

  test("rejects an unauthenticated caller", async () => {
    const t = convexTest(schema, modules);
    const { cat } = await seedUser(t);
    await expect(
      t.mutation(api.transactions.create, {
        type: "expense",
        amount: 100,
        categoryId: cat("food"),
        date: midMonth(0),
        source: "manual",
      }),
    ).rejects.toThrow();
  });
});

describe("transactions.update / remove", () => {
  test("update validates ownership, amount, and does a partial patch", async () => {
    const t = convexTest(schema, modules);
    const { userId, cat } = await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });

    const id = await addTxn(t, userId, cat("food"), "expense", 500, midMonth(0), "old");

    await asUser.mutation(api.transactions.update, { id, amount: 750 });
    let row = await t.run((ctx) => ctx.db.get(id));
    expect(row?.amount).toBe(750);
    expect(row?.description).toBe("old"); // untouched

    await expect(
      asUser.mutation(api.transactions.update, { id, amount: -1 }),
    ).rejects.toThrow(/greater than zero/);

    row = await t.run((ctx) => ctx.db.get(id));
    expect(row?.amount).toBe(750); // failed update did not persist
  });

  test("remove deletes only the owner's row", async () => {
    const t = convexTest(schema, modules);
    const a = await seedUser(t, SUBJECT_A);
    await seedUser(t, SUBJECT_B);
    const asB = t.withIdentity({ subject: SUBJECT_B });

    const aTxn = await addTxn(t, a.userId, a.cat("food"), "expense", 500, midMonth(0));

    await expect(
      asB.mutation(api.transactions.remove, { id: aTxn }),
    ).rejects.toThrow(/does not belong/);
    expect(await t.run((ctx) => ctx.db.get(aTxn))).not.toBeNull();
  });
});

describe("transactions.list", () => {
  test("returns only the caller's rows, newest first, within the date window", async () => {
    const t = convexTest(schema, modules);
    const a = await seedUser(t, SUBJECT_A);
    const b = await seedUser(t, SUBJECT_B);

    await addTxn(t, a.userId, a.cat("food"), "expense", 100, midMonth(-1));
    await addTxn(t, a.userId, a.cat("food"), "expense", 200, midMonth(0));
    await addTxn(t, b.userId, b.cat("food"), "expense", 999, midMonth(0));

    const asA = t.withIdentity({ subject: SUBJECT_A });
    const all = await asA.query(api.transactions.list, {});
    expect(all).toHaveLength(2);
    expect(all.every((r) => r.amount !== 999)).toBe(true);
    expect(all[0].date).toBeGreaterThanOrEqual(all[1].date); // desc

    const windowed = await asA.query(api.transactions.list, {
      dateFrom: midMonth(0) - 5 * DAY,
    });
    expect(windowed).toHaveLength(1);
    expect(windowed[0].amount).toBe(200);
  });
});
