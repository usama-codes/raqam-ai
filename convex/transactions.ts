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

type ListArgs = {
  dateFrom?: number;
  dateTo?: number;
};

type CreateTxArgs = {
  type: "income" | "expense";
  amount: number;
  categoryId: Id<"categories">;
  date: number;
  description?: string;
  descriptionUr?: string;
  notes?: string;
  source: "manual" | "conversational" | "voice" | "receipt" | "import";
};

type UpdateTxArgs = {
  id: Id<"transactions">;
  type?: "income" | "expense";
  amount?: number;
  categoryId?: Id<"categories">;
  date?: number;
  description?: string;
  descriptionUr?: string;
  notes?: string;
};

type RemoveArgs = { id: Id<"transactions"> };

// ─── Queries ────────────────────────────────────────────────────────────────────

/**
 * List transactions for the authenticated user, ordered by date descending.
 * Optionally filter by date range.
 */
export const list = query({
  args: {
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx: QueryCtx, args: ListArgs) => {
    const user = await requireUser(ctx);
    const all = await ctx.db
      .query("transactions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return all.filter((t) => {
      if (args.dateFrom !== undefined && t.date < args.dateFrom) return false;
      if (args.dateTo !== undefined && t.date >= args.dateTo) return false;
      return true;
    });
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────────

/**
 * Create a new transaction. Validates amount, category ownership.
 */
export const create = mutation({
  args: {
    type: v.union(v.literal("income"), v.literal("expense")),
    amount: v.number(),
    categoryId: v.id("categories"),
    date: v.number(),
    description: v.optional(v.string()),
    descriptionUr: v.optional(v.string()),
    notes: v.optional(v.string()),
    source: v.union(
      v.literal("manual"),
      v.literal("conversational"),
      v.literal("voice"),
      v.literal("receipt"),
      v.literal("import"),
    ),
  },
  handler: async (ctx: MutationCtx, args: CreateTxArgs) => {
    const user = await requireUser(ctx);

    // Validate positive amount
    if (args.amount <= 0) {
      throw new Error("Transaction amount must be greater than zero.");
    }

    // Verify category belongs to user
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.userId !== user._id) {
      throw new Error("Category not found or does not belong to this user.");
    }

    const now = Date.now();
    return await ctx.db.insert("transactions", {
      userId: user._id,
      type: args.type,
      amount: args.amount,
      categoryId: args.categoryId,
      description: args.description,
      descriptionUr: args.descriptionUr,
      date: args.date,
      notes: args.notes,
      source: args.source,
      isRecurring: false,
      pendingConfirmation: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update an existing transaction. Validates ownership and input.
 */
export const update = mutation({
  args: {
    id: v.id("transactions"),
    type: v.optional(v.union(v.literal("income"), v.literal("expense"))),
    amount: v.optional(v.number()),
    categoryId: v.optional(v.id("categories")),
    date: v.optional(v.number()),
    description: v.optional(v.string()),
    descriptionUr: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args: UpdateTxArgs) => {
    const user = await requireUser(ctx);

    const transaction = await ctx.db.get(args.id);
    if (!transaction || transaction.userId !== user._id) {
      throw new Error("Transaction not found or does not belong to this user.");
    }

    // Validate amount if provided
    if (args.amount !== undefined && args.amount <= 0) {
      throw new Error("Transaction amount must be greater than zero.");
    }

    // Verify category ownership if changing
    if (args.categoryId !== undefined) {
      const category = await ctx.db.get(args.categoryId);
      if (!category || category.userId !== user._id) {
        throw new Error("Category not found or does not belong to this user.");
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.type !== undefined) updates.type = args.type;
    if (args.amount !== undefined) updates.amount = args.amount;
    if (args.categoryId !== undefined) updates.categoryId = args.categoryId;
    if (args.date !== undefined) updates.date = args.date;
    if (args.description !== undefined) updates.description = args.description;
    if (args.descriptionUr !== undefined)
      updates.descriptionUr = args.descriptionUr;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.id, updates);
  },
});

/**
 * Delete a transaction. Validates ownership.
 */
export const remove = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx: MutationCtx, args: RemoveArgs) => {
    const user = await requireUser(ctx);

    const transaction = await ctx.db.get(args.id);
    if (!transaction || transaction.userId !== user._id) {
      throw new Error("Transaction not found or does not belong to this user.");
    }

    await ctx.db.delete(args.id);
  },
});
