// @vitest-environment edge-runtime
//
// convex/pendingActions.ts — the Phase 9 AI confirmation gate.
// AGENTS.md §12: "Zero write-tool mutations exist in Convex without a corresponding
// confirmed pendingAction." Rejected actions must execute nothing.

import { convexTest } from "convex-test";
import { describe, test, expect } from "vitest";
import { api } from "@/convex/_generated/api";
import schema from "@/convex/schema";
import { modules, seedUser, addTxn, midMonth, SUBJECT_A, SUBJECT_B } from "./_helpers";

async function conversationFor(t: ReturnType<typeof convexTest>, subject: string) {
  return t
    .withIdentity({ subject })
    .mutation(api.conversations.createConversation, {});
}

describe("createPendingAction", () => {
  test("rejects a conversation owned by another user", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, SUBJECT_A);
    await seedUser(t, SUBJECT_B);
    const aConv = await conversationFor(t, SUBJECT_A);

    await expect(
      t.withIdentity({ subject: SUBJECT_B }).mutation(
        api.pendingActions.createPendingAction,
        {
          conversationId: aConv,
          actionType: "createTransaction",
          parameters: "{}",
          userFacingMessage: "x",
        },
      ),
    ).rejects.toThrow(/Conversation not found/);
  });
});

describe("confirmAction", () => {
  test("createTransaction: confirming executes the mutation and marks the action executed", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });
    const conv = await conversationFor(t, SUBJECT_A);

    const actionId = await asUser.mutation(api.pendingActions.createPendingAction, {
      conversationId: conv,
      actionType: "createTransaction",
      parameters: JSON.stringify({
        type: "expense",
        amount: 850,
        description: "Petrol",
        categoryName: "transportation",
      }),
      userFacingMessage: "Petrol Rs. 850 add karein?",
    });

    const out = await asUser.mutation(api.pendingActions.confirmAction, { actionId });
    expect(out.success).toBe(true);

    const txns = await t.run((ctx) => ctx.db.query("transactions").collect());
    expect(txns).toHaveLength(1);
    expect(txns[0].amount).toBe(850);
    expect(txns[0].source).toBe("conversational");

    const action = await t.run((ctx) => ctx.db.get(actionId));
    expect(action?.status).toBe("executed");
    expect(action?.resultMessage).toBeTruthy();
  });

  test("createSavingsGoal and deleteTransaction execute through the gate", async () => {
    const t = convexTest(schema, modules);
    const { userId, cat } = await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });
    const conv = await conversationFor(t, SUBJECT_A);
    await addTxn(t, userId, cat("food"), "expense", 500, midMonth(0), "chai kharcha");

    const goalAction = await asUser.mutation(api.pendingActions.createPendingAction, {
      conversationId: conv,
      actionType: "createSavingsGoal",
      parameters: JSON.stringify({ name: "Bike", targetAmount: 120_000 }),
      userFacingMessage: "Bike goal banayein?",
    });
    await asUser.mutation(api.pendingActions.confirmAction, { actionId: goalAction });
    expect(await t.run((ctx) => ctx.db.query("savingsGoals").collect())).toHaveLength(1);

    const delAction = await asUser.mutation(api.pendingActions.createPendingAction, {
      conversationId: conv,
      actionType: "deleteTransaction",
      parameters: JSON.stringify({ description: "chai" }),
      userFacingMessage: "Chai kharcha delete karein?",
    });
    await asUser.mutation(api.pendingActions.confirmAction, { actionId: delAction });
    expect(await t.run((ctx) => ctx.db.query("transactions").collect())).toHaveLength(0);
  });

  test("a resolved action cannot be confirmed again", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });
    const conv = await conversationFor(t, SUBJECT_A);

    const actionId = await asUser.mutation(api.pendingActions.createPendingAction, {
      conversationId: conv,
      actionType: "createSavingsGoal",
      parameters: JSON.stringify({ name: "Fund", targetAmount: 10_000 }),
      userFacingMessage: "x",
    });
    await asUser.mutation(api.pendingActions.confirmAction, { actionId });

    await expect(
      asUser.mutation(api.pendingActions.confirmAction, { actionId }),
    ).rejects.toThrow(/no longer pending/);
  });

  test("bad params: action marked failed, nothing written (Phase 15 fix)", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });
    const conv = await conversationFor(t, SUBJECT_A);

    const actionId = await asUser.mutation(api.pendingActions.createPendingAction, {
      conversationId: conv,
      actionType: "createTransaction",
      parameters: JSON.stringify({ type: "expense", amount: 100 }), // no description/category
      userFacingMessage: "x",
    });

    // confirmAction no longer throws on executor failure — it returns
    // { success: false } so the "failed" status patch can commit.
    const out = await asUser.mutation(api.pendingActions.confirmAction, { actionId });
    expect(out.success).toBe(false);
    expect(out.error).toMatch(/Missing required parameters/);

    // Executor validates before its first write, so nothing was inserted.
    expect(await t.run((ctx) => ctx.db.query("transactions").collect())).toHaveLength(0);

    // The row is now distinguishable from an un-actioned one.
    const action = await t.run((ctx) => ctx.db.get(actionId));
    expect(action?.status).toBe("failed");
    expect(action?.resultMessage).toMatch(/Missing required parameters/);

    // A failed action cannot be confirmed again.
    await expect(
      asUser.mutation(api.pendingActions.confirmAction, { actionId }),
    ).rejects.toThrow(/no longer pending/);
  });

  test("AI-initiated executions write an auditLog row (source: ai)", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });
    const conv = await conversationFor(t, SUBJECT_A);

    const actionId = await asUser.mutation(api.pendingActions.createPendingAction, {
      conversationId: conv,
      actionType: "createTransaction",
      parameters: JSON.stringify({
        type: "expense",
        amount: 850,
        description: "Petrol",
        categoryName: "transportation",
      }),
      userFacingMessage: "x",
    });
    await asUser.mutation(api.pendingActions.confirmAction, { actionId });

    const rows = await t.run((ctx) => ctx.db.query("auditLog").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe("ai");
    expect(rows[0].action).toBe("transaction.create");
    expect(rows[0].entityType).toBe("transaction");
  });

  test("a user cannot confirm another user's pending action", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t, SUBJECT_A);
    await seedUser(t, SUBJECT_B);
    const aConv = await conversationFor(t, SUBJECT_A);
    const actionId = await t
      .withIdentity({ subject: SUBJECT_A })
      .mutation(api.pendingActions.createPendingAction, {
        conversationId: aConv,
        actionType: "createSavingsGoal",
        parameters: JSON.stringify({ name: "A", targetAmount: 1_000 }),
        userFacingMessage: "x",
      });

    await expect(
      t
        .withIdentity({ subject: SUBJECT_B })
        .mutation(api.pendingActions.confirmAction, { actionId }),
    ).rejects.toThrow(/does not belong/);
  });
});

describe("rejectAction", () => {
  test("rejecting executes nothing (AGENTS.md §12)", async () => {
    const t = convexTest(schema, modules);
    await seedUser(t);
    const asUser = t.withIdentity({ subject: SUBJECT_A });
    const conv = await conversationFor(t, SUBJECT_A);

    const actionId = await asUser.mutation(api.pendingActions.createPendingAction, {
      conversationId: conv,
      actionType: "createTransaction",
      parameters: JSON.stringify({
        type: "expense",
        amount: 5_000,
        description: "TV",
        categoryName: "shopping",
      }),
      userFacingMessage: "TV add karein?",
    });

    await asUser.mutation(api.pendingActions.rejectAction, { actionId });

    expect((await t.run((ctx) => ctx.db.get(actionId)))?.status).toBe("rejected");
    expect(await t.run((ctx) => ctx.db.query("transactions").collect())).toHaveLength(0);

    // And a rejected action cannot then be confirmed.
    await expect(
      asUser.mutation(api.pendingActions.confirmAction, { actionId }),
    ).rejects.toThrow(/no longer pending/);
  });
});
