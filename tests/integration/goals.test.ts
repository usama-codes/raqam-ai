// @vitest-environment edge-runtime
//
// convex/goals.ts — create / update / contribute / remove, with ownership and
// auto-completion checks.

import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";
import { modules, seedUser, SUBJECT_A, SUBJECT_B } from "./_helpers";

describe("goals.create", () => {
  test("rejects an empty name and a non-positive target", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });

    await expect(
      asUser.mutation(api.goals.create, { name: "   ", targetAmount: 1000 }),
    ).rejects.toThrow(/name cannot be empty/);

    await expect(
      asUser.mutation(api.goals.create, { name: "Bike", targetAmount: 0 }),
    ).rejects.toThrow(/greater than zero/);
  });
});

describe("goals.contribute", () => {
  test("rejects a non-positive amount and marks completed when the target is reached", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });

    const id = await asUser.mutation(api.goals.create, {
      name: "Emergency fund",
      targetAmount: 10_000,
    });

    await expect(
      asUser.mutation(api.goals.contribute, { id, amount: 0 }),
    ).rejects.toThrow(/greater than zero/);

    await asUser.mutation(api.goals.contribute, { id, amount: 4_000 });
    let goal = await t.run((ctx) => ctx.db.get(id));
    expect(goal?.currentAmount).toBe(4_000);
    expect(goal?.isCompleted).toBe(false);

    await asUser.mutation(api.goals.contribute, { id, amount: 6_500 });
    goal = await t.run((ctx) => ctx.db.get(id));
    expect(goal?.currentAmount).toBe(10_500);
    expect(goal?.isCompleted).toBe(true);
  });

  test("a user cannot contribute to another user's goal", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, SUBJECT_A);
    await seedUser(t, SUBJECT_B);
    const asA = t.withIdentity({ subject: SUBJECT_A });
    const asB = t.withIdentity({ subject: SUBJECT_B });

    const aGoal = await asA.mutation(api.goals.create, {
      name: "Hajj",
      targetAmount: 500_000,
    });

    await expect(
      asB.mutation(api.goals.contribute, { id: aGoal, amount: 1_000 }),
    ).rejects.toThrow(/does not belong/);
  });
});

describe("goals.update", () => {
  test("rejects a non-positive target and auto-completes when target drops below saved", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });

    const id = await asUser.mutation(api.goals.create, {
      name: "Laptop",
      targetAmount: 200_000,
    });
    await asUser.mutation(api.goals.contribute, { id, amount: 90_000 });

    await expect(
      asUser.mutation(api.goals.update, { id, targetAmount: -5 }),
    ).rejects.toThrow(/greater than zero/);

    await asUser.mutation(api.goals.update, { id, targetAmount: 80_000 });
    const goal = await t.run((ctx) => ctx.db.get(id));
    expect(goal?.targetAmount).toBe(80_000);
    expect(goal?.isCompleted).toBe(true);
  });
});

describe("goals.list / remove", () => {
  test("list returns only the caller's goals; remove is owner-only", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, SUBJECT_A);
    await seedUser(t, SUBJECT_B);
    const asA = t.withIdentity({ subject: SUBJECT_A });
    const asB = t.withIdentity({ subject: SUBJECT_B });

    const aGoal = await asA.mutation(api.goals.create, {
      name: "Car",
      targetAmount: 1_000_000,
    });
    await asB.mutation(api.goals.create, { name: "Phone", targetAmount: 90_000 });

    expect(await asA.query(api.goals.list, {})).toHaveLength(1);
    expect((await asB.query(api.goals.list, {}))[0].name).toBe("Phone");

    await expect(
      asB.mutation(api.goals.remove, { id: aGoal }),
    ).rejects.toThrow(/does not belong/);
  });
});
