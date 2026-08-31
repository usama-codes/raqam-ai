// convex/pendingActions.ts — Queries and mutations for the AI confirmation gate (Phase 9)
//
// Pending actions are created by the AI pipeline when the Action Agent proposes
// a mutation. The user must confirm before the underlying mutation executes.
// No mutation executes without a confirmed pendingAction — this is the gate.

import {
  mutation,
  query,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";
import { logAudit } from "./auditLog";
import type { Id } from "./_generated/dataModel";

// ─── Queries ────────────────────────────────────────────────────────────────────

/**
 * List all pending actions for the current conversation.
 * Returns actions with status "pending" only (awaiting user decision).
 */
export const listForConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx: QueryCtx, args) => {
    const user = await requireUser(ctx);

    // Verify conversation ownership
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    return ctx.db
      .query("pendingActions")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .order("desc")
      .collect();
  },
});

// ─── Internal mutations (called from the AI action) ────────────────────────────

/**
 * Create a new pending action. Called from convex/ai.ts after the Action Agent
 * proposes a mutation. The action stays in "pending" status until the user
 * confirms or rejects it.
 */
export const createPendingAction = mutation({
  args: {
    conversationId: v.id("conversations"),
    actionType: v.union(
      v.literal("createTransaction"),
      v.literal("deleteTransaction"),
      v.literal("createSavingsGoal"),
    ),
    parameters: v.string(),
    userFacingMessage: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);

    // Verify conversation ownership
    const conv = await ctx.db.get(args.conversationId);
    if (!conv || conv.userId !== user._id) {
      throw new Error("Conversation not found");
    }

    const now = Date.now();
    return await ctx.db.insert("pendingActions", {
      userId: user._id,
      conversationId: args.conversationId,
      actionType: args.actionType,
      parameters: args.parameters,
      userFacingMessage: args.userFacingMessage,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ─── User-facing mutations (called from the client hook) ───────────────────────

/**
 * Confirm and execute a pending action.
 *
 * Flow:
 * 1. Validate the pending action belongs to the user
 * 2. Parse and validate the stored parameters
 * 3. Execute the underlying mutation (create transaction, delete, or create goal)
 * 4. Update pendingAction status to "executed" (or "failed" on error)
 *
 * On executor failure the handler **returns `{ success: false }`** rather than
 * throwing: a Convex mutation rolls back every write when the handler throws,
 * so an earlier `throw err` here also rolled back the `status: "failed"` patch
 * and left the action stuck at "pending". Returning normally lets the "failed"
 * status commit. This is only safe because every executor below validates all
 * inputs *before* its first write — a future executor that writes then throws
 * would leave a partial record. Keep executors validate-first.
 */
export const confirmAction = mutation({
  args: { actionId: v.id("pendingActions") },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);

    const pendingAction = await ctx.db.get(args.actionId);
    if (!pendingAction || pendingAction.userId !== user._id) {
      throw new Error("Action not found or does not belong to this user.");
    }
    if (pendingAction.status !== "pending") {
      throw new Error("Action is no longer pending.");
    }

    try {
      const params = JSON.parse(pendingAction.parameters);
      let resultMessage = "";

      switch (pendingAction.actionType) {
        case "createTransaction": {
          resultMessage = await executeCreateTransaction(ctx, user, params);
          break;
        }
        case "deleteTransaction": {
          resultMessage = await executeDeleteTransaction(ctx, user, params);
          break;
        }
        case "createSavingsGoal": {
          resultMessage = await executeCreateSavingsGoal(ctx, user, params);
          break;
        }
        default:
          throw new Error(`Unknown action type: ${pendingAction.actionType}`);
      }

      await ctx.db.patch(args.actionId, {
        status: "executed",
        resultMessage,
        updatedAt: Date.now(),
      });

      return { success: true as const, resultMessage };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Execution failed";
      await ctx.db.patch(args.actionId, {
        status: "failed",
        resultMessage: message,
        updatedAt: Date.now(),
      });
      return { success: false as const, error: message };
    }
  },
});

/**
 * Reject a pending action. No mutation is executed.
 */
export const rejectAction = mutation({
  args: { actionId: v.id("pendingActions") },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);

    const pendingAction = await ctx.db.get(args.actionId);
    if (!pendingAction || pendingAction.userId !== user._id) {
      throw new Error("Action not found or does not belong to this user.");
    }
    if (pendingAction.status !== "pending") {
      throw new Error("Action is no longer pending.");
    }

    await ctx.db.patch(args.actionId, {
      status: "rejected",
      updatedAt: Date.now(),
    });
  },
});

// ─── Action executors ─────────────────────────────────────────────────────────

/**
 * Execute a createTransaction mutation from a confirmed pending action.
 */
async function executeCreateTransaction(
  ctx: MutationCtx,
  user: { _id: Id<"users"> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): Promise<string> {
  if (
    !params.type ||
    !params.amount ||
    !params.description ||
    !params.categoryName
  ) {
    throw new Error("Missing required parameters for createTransaction.");
  }
  if (params.amount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  // Resolve category by English name
  const category = await ctx.db
    .query("categories")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .filter((q) => q.eq(q.field("name"), params.categoryName))
    .first();

  if (!category) {
    // Fallback to "other" category
    const otherCategory = await ctx.db
      .query("categories")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("name"), "other"))
      .first();

    if (!otherCategory) {
      throw new Error(
        `Category "${params.categoryName}" not found and no fallback available.`,
      );
    }

    // Use fallback category
    params.categoryName = "other";
    return await insertTransaction(ctx, user, params, otherCategory._id);
  }

  return await insertTransaction(ctx, user, params, category._id);
}

/**
 * Helper to insert a transaction record.
 */
async function insertTransaction(
  ctx: MutationCtx,
  user: { _id: Id<"users"> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
  categoryId: Id<"categories">,
): Promise<string> {
  // Parse date (ISO string → midnight UTC ms) or default to today
  let dateMs: number;
  if (params.date) {
    const parsed = new Date(params.date);
    dateMs = new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
    ).getTime();
  } else {
    const now = new Date();
    dateMs = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
  }

  const transactionId = await ctx.db.insert("transactions", {
    userId: user._id,
    type: params.type,
    amount: params.amount,
    categoryId,
    description: params.description,
    descriptionUr: params.descriptionUr,
    date: dateMs,
    notes: params.notes,
    source: "conversational",
    isRecurring: false,
    pendingConfirmation: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  await logAudit(ctx, {
    userId: user._id,
    action: "transaction.create",
    entityType: "transaction",
    entityId: transactionId,
    metadata: JSON.stringify({
      type: params.type,
      amount: params.amount,
      description: params.description,
      categoryName: params.categoryName,
    }),
    source: "ai",
  });

  return `${params.type === "income" ? "آمدنی" : "خرچ"} Rs. ${params.amount.toLocaleString()} — ${params.description} شامل ہو گیا۔`;
}

/**
 * Execute a deleteTransaction mutation from a confirmed pending action.
 * Finds the most recent transaction matching the description.
 */
async function executeDeleteTransaction(
  ctx: MutationCtx,
  user: { _id: Id<"users"> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): Promise<string> {
  if (!params.description) {
    throw new Error("Missing description for deleteTransaction.");
  }

  // Find the most recent transaction matching the description
  const allTxns = await ctx.db
    .query("transactions")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .order("desc")
    .collect();

  const match = allTxns.find((t) => {
    const descMatch =
      t.description?.toLowerCase().includes(params.description.toLowerCase()) ??
      false;
    const amountMatch =
      params.amount !== undefined ? t.amount === params.amount : true;
    return descMatch && amountMatch;
  });

  if (!match) {
    throw new Error(`No transaction found matching "${params.description}".`);
  }

  await ctx.db.delete(match._id);

  await logAudit(ctx, {
    userId: user._id,
    action: "transaction.delete",
    entityType: "transaction",
    entityId: match._id,
    metadata: JSON.stringify({
      amount: match.amount,
      description: match.description,
    }),
    source: "ai",
  });

  return `Rs. ${match.amount.toLocaleString()} — ${match.description ?? "لین دین"} حذف ہو گیا۔`;
}

/**
 * Execute a createSavingsGoal mutation from a confirmed pending action.
 */
async function executeCreateSavingsGoal(
  ctx: MutationCtx,
  user: { _id: Id<"users"> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
): Promise<string> {
  if (!params.name || !params.targetAmount) {
    throw new Error("Missing required parameters for createSavingsGoal.");
  }
  if (params.targetAmount <= 0) {
    throw new Error("Target amount must be greater than zero.");
  }

  let targetDate: number | undefined;
  if (params.targetDate) {
    targetDate = new Date(params.targetDate).getTime();
  }

  const now = Date.now();
  const goalId = await ctx.db.insert("savingsGoals", {
    userId: user._id,
    name: params.name,
    nameUr: params.nameUr,
    targetAmount: params.targetAmount,
    currentAmount: 0,
    targetDate,
    isCompleted: false,
    createdAt: now,
    updatedAt: now,
  });

  await logAudit(ctx, {
    userId: user._id,
    action: "goal.create",
    entityType: "savingsGoal",
    entityId: goalId,
    metadata: JSON.stringify({
      name: params.name,
      targetAmount: params.targetAmount,
    }),
    source: "ai",
  });

  return `بچت کا ہدف "${params.name}" — Rs. ${params.targetAmount.toLocaleString()} بن گیا۔`;
}
