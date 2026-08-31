// @vitest-environment edge-runtime
//
// convex/seed.ts — the demo-data helper (Phase 15). Not app code, but a broken
// seed means a broken judge demo, so guard its shape.

import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";
import { modules, seedUser, SUBJECT_A } from "./_helpers";

const EMAIL = "clerk-user-a@example.com"; // seedUser derives this from SUBJECT_A

describe("seed:demo", () => {
  test("builds a full dataset and stamps onboarding", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, SUBJECT_A);

    const res = await t.mutation(api.seed.demo, { email: EMAIL });
    expect(res.transactions).toBeGreaterThan(30);

    const txns = await t.run((ctx) => ctx.db.query("transactions").collect());
    expect(txns.filter((x) => x.type === "income")).toHaveLength(3);
    expect(txns.some((x) => x.amount === 8000)).toBe(true); // utilities spike

    const budgetCats = await t.run((ctx) =>
      ctx.db.query("budgetCategories").collect(),
    );
    expect(budgetCats.length).toBeGreaterThanOrEqual(5);

    const goals = await t.run((ctx) => ctx.db.query("savingsGoals").collect());
    expect(goals).toHaveLength(2);
    expect(goals.every((g) => !g.isCompleted)).toBe(true);

    const recurring = await t.run((ctx) =>
      ctx.db.query("recurringExpenses").collect(),
    );
    expect(recurring).toHaveLength(2);

    const convos = await t.run((ctx) => ctx.db.query("conversations").collect());
    expect(convos).toHaveLength(3);
    const msgs = await t.run((ctx) => ctx.db.query("messages").collect());
    expect(msgs.length).toBeGreaterThanOrEqual(6);

    const user = await t.run((ctx) => ctx.db.get(convos[0].userId));
    expect(user?.onboardingCompletedAt).toBeTruthy();
  });

  test("is re-runnable and clearDemo wipes finance data", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, SUBJECT_A);

    await t.mutation(api.seed.demo, { email: EMAIL });
    await t.mutation(api.seed.demo, { email: EMAIL }); // no duplication / crash
    const afterReseed = await t.run((ctx) =>
      ctx.db.query("savingsGoals").collect(),
    );
    expect(afterReseed).toHaveLength(2);

    await t.mutation(api.seed.clearDemo, { email: EMAIL });
    expect(await t.run((ctx) => ctx.db.query("transactions").collect())).toHaveLength(0);
    expect(await t.run((ctx) => ctx.db.query("savingsGoals").collect())).toHaveLength(0);
    expect(await t.run((ctx) => ctx.db.query("conversations").collect())).toHaveLength(0);
    expect(await t.run((ctx) => ctx.db.query("messages").collect())).toHaveLength(0);
  });

  test("throws for an unknown email", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.seed.demo, { email: "nobody@example.com" }),
    ).rejects.toThrow(/No user with email/);
  });
});
