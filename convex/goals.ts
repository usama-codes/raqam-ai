import {
  mutation,
  query,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";
import type { Id } from "./_generated/dataModel";

// ─── Arg types (mirror the validators for IDE type resolution) ──────────────────

type CreateGoalArgs = {
  name: string;
  nameUr?: string;
  targetAmount: number;
  targetDate?: number;
};

type UpdateGoalArgs = {
  id: Id<"savingsGoals">;
  name?: string;
  nameUr?: string;
  targetAmount?: number;
  targetDate?: number;
};

type ContributeArgs = { id: Id<"savingsGoals">; amount: number };
type RemoveArgs = { id: Id<"savingsGoals"> };

// ─── Queries ────────────────────────────────────────────────────────────────────

/**
 * List all savings goals for the authenticated user.
 */
export const list = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("savingsGoals")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────────

/**
 * Create a new savings goal.
 */
export const create = mutation({
  args: {
    name: v.string(),
    nameUr: v.optional(v.string()),
    targetAmount: v.number(),
    targetDate: v.optional(v.number()),
  },
  handler: async (ctx: MutationCtx, args: CreateGoalArgs) => {
    const user = await requireUser(ctx);

    if (!args.name.trim()) {
      throw new Error("Goal name cannot be empty.");
    }
    if (args.targetAmount <= 0) {
      throw new Error("Target amount must be greater than zero.");
    }

    const now = Date.now();
    return await ctx.db.insert("savingsGoals", {
      userId: user._id,
      name: args.name.trim(),
      nameUr: args.nameUr,
      targetAmount: args.targetAmount,
      currentAmount: 0,
      targetDate: args.targetDate,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a savings goal's metadata (name, target, date).
 */
export const update = mutation({
  args: {
    id: v.id("savingsGoals"),
    name: v.optional(v.string()),
    nameUr: v.optional(v.string()),
    targetAmount: v.optional(v.number()),
    targetDate: v.optional(v.number()),
  },
  handler: async (ctx: MutationCtx, args: UpdateGoalArgs) => {
    const user = await requireUser(ctx);

    const goal = await ctx.db.get(args.id);
    if (!goal || goal.userId !== user._id) {
      throw new Error("Goal not found or does not belong to this user.");
    }

    if (args.targetAmount !== undefined && args.targetAmount <= 0) {
      throw new Error("Target amount must be greater than zero.");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.nameUr !== undefined) updates.nameUr = args.nameUr;
    if (args.targetAmount !== undefined)
      updates.targetAmount = args.targetAmount;
    if (args.targetDate !== undefined) updates.targetDate = args.targetDate;

    // Auto-complete when currentAmount meets or exceeds the target
    const effectiveTarget =
      args.targetAmount !== undefined ? args.targetAmount : goal.targetAmount;
    if (goal.currentAmount >= effectiveTarget) {
      updates.isCompleted = true;
    }

    await ctx.db.patch(args.id, updates);
  },
});

/**
 * Add a contribution to a savings goal. Marks as completed when target reached.
 */
export const contribute = mutation({
  args: {
    id: v.id("savingsGoals"),
    amount: v.number(),
  },
  handler: async (ctx: MutationCtx, args: ContributeArgs) => {
    const user = await requireUser(ctx);

    if (args.amount <= 0) {
      throw new Error("Contribution amount must be greater than zero.");
    }

    const goal = await ctx.db.get(args.id);
    if (!goal || goal.userId !== user._id) {
      throw new Error("Goal not found or does not belong to this user.");
    }

    const newAmount = goal.currentAmount + args.amount;
    const isCompleted = newAmount >= goal.targetAmount;

    await ctx.db.patch(args.id, {
      currentAmount: newAmount,
      isCompleted,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a savings goal. Validates ownership.
 */
export const remove = mutation({
  args: { id: v.id("savingsGoals") },
  handler: async (ctx: MutationCtx, args: RemoveArgs) => {
    const user = await requireUser(ctx);

    const goal = await ctx.db.get(args.id);
    if (!goal || goal.userId !== user._id) {
      throw new Error("Goal not found or does not belong to this user.");
    }

    await ctx.db.delete(args.id);
  },
});
