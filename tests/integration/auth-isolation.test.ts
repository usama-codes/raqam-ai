// @vitest-environment edge-runtime
//
// Phase 14 exit gate: "Auth isolation verified with two real test users."
// Two distinct Clerk identities (SUBJECT_A / SUBJECT_B), each with their own
// data. Every read is scoped to the caller; every unauthenticated call is
// rejected. AGENTS.md §8 (Authorization rules), §12 (Auth isolation).

import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";
import { modules, seedUser, addTxn, midMonth, SUBJECT_A, SUBJECT_B } from "./_helpers";

async function seedWorld(t: ReturnType<typeof convexTest>, subject: string, tag: string) {
  const { userId, cat } = await seedUser(t, subject);
  const as = t.withIdentity({ subject });
  await addTxn(t, userId, cat("food"), "expense", 1_234, midMonth(0), `${tag}-txn`);
  const budgetId = await as.mutation(api.budgets.create, { month: midMonth(0) });
  await as.mutation(api.budgets.upsertCategory, {
    budgetId,
    categoryId: cat("food"),
    limit: 5_000,
  });
  await as.mutation(api.goals.create, { name: `${tag}-goal`, targetAmount: 50_000 });
  const conversationId = await as.mutation(api.conversations.createConversation, {});
  await as.mutation(api.conversations.addUserMessage, {
    conversationId,
    content: `${tag} secret message`,
  });
  return { userId, cat, as, budgetId, conversationId };
}

describe("two-user data isolation", () => {
  test("each user's reads return only their own rows", async () => {
    const t = convexTest(schema, modules);
    const a = await seedWorld(t, SUBJECT_A, "A");
    const b = await seedWorld(t, SUBJECT_B, "B");

    const aTxns = await a.as.query(api.transactions.list, {});
    expect(aTxns).toHaveLength(1);
    expect(aTxns[0].description).toBe("A-txn");

    const bGoals = await b.as.query(api.goals.list, {});
    expect(bGoals.map((g) => g.name)).toEqual(["B-goal"]);

    expect(await a.as.query(api.conversations.list, {})).toHaveLength(1);

    // Conversation history is ownership-checked (Phase 14 fix).
    const bHistory = await b.as.query(api.assistant.getConversationHistory, {
      conversationId: b.conversationId,
    });
    expect(bHistory[0].content).toBe("B secret message");
    await expect(
      b.as.query(api.assistant.getConversationHistory, {
        conversationId: a.conversationId, // A's conversation
      }),
    ).rejects.toThrow(/Conversation not found/);

    // A's financial summary never sees B's 1,234 expense.
    const aSummary = await a.as.query(api.summary.getFinancialSummary, {});
    expect(aSummary.totalExpenses).toBe(1_234);
  });

  test("by-id mutations reject a caller who does not own the record", async () => {
    const t = convexTest(schema, modules);
    const a = await seedWorld(t, SUBJECT_A, "A");
    const b = await seedWorld(t, SUBJECT_B, "B");

    const aTxn = (await a.as.query(api.transactions.list, {}))[0]._id;
    const aGoal = (await a.as.query(api.goals.list, {}))[0]._id;

    await expect(
      b.as.mutation(api.transactions.remove, { id: aTxn }),
    ).rejects.toThrow(/does not belong/);
    await expect(
      b.as.mutation(api.goals.contribute, { id: aGoal, amount: 100 }),
    ).rejects.toThrow(/does not belong/);
    await expect(
      b.as.mutation(api.conversations.deleteConversation, {
        conversationId: a.conversationId,
      }),
    ).rejects.toThrow(/Conversation not found/);
  });
});

describe("unauthenticated access", () => {
  test("representative queries and mutations reject a caller with no identity", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);

    await expect(t.query(api.transactions.list, {})).rejects.toThrow();
    await expect(t.query(api.categories.list, {})).rejects.toThrow();
    await expect(t.query(api.goals.list, {})).rejects.toThrow();
    await expect(t.query(api.summary.getFinancialSummary, {})).rejects.toThrow();
    await expect(t.query(api.conversations.list, {})).rejects.toThrow();
    await expect(
      t.mutation(api.goals.create, { name: "x", targetAmount: 1 }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.budgets.create, { month: midMonth(0) }),
    ).rejects.toThrow();
  });
});
