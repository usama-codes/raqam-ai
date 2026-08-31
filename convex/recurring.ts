// convex/recurring.ts — Recurring-expense / bill management (Phase 13)
//
// Users create recurring bills here; the dashboard "Upcoming bills" widget
// (convex/summary.ts) and the proactive bill-reminder banner (convex/proactive.ts)
// both read them. `markPaid` advances the due date one cycle and can log the
// expense as a real transaction in the same (atomic) mutation.

import {
  mutation,
  query,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";
import type { Id } from "./_generated/dataModel";
import { advanceDueDate } from "@/lib/finance/recurring-schedule";

// ─── Arg types (mirror the validators for IDE type resolution) ──────────────────

const frequencyValidator = v.union(
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("monthly"),
  v.literal("yearly"),
);

type Frequency = "daily" | "weekly" | "monthly" | "yearly";

type CreateArgs = {
  categoryId: Id<"categories">;
  description: string;
  amount: number;
  frequency: Frequency;
  nextDueDate: number;
};

type UpdateArgs = {
  id: Id<"recurringExpenses">;
  categoryId?: Id<"categories">;
  description?: string;
  amount?: number;
  frequency?: Frequency;
  nextDueDate?: number;
  isActive?: boolean;
};

type RemoveArgs = { id: Id<"recurringExpenses"> };
type MarkPaidArgs = { id: Id<"recurringExpenses">; logExpense: boolean };

// ─── Queries ────────────────────────────────────────────────────────────────────

/**
 * List the user's recurring expenses, joined with category display fields,
 * soonest due first.
 */
export const list = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const user = await requireUser(ctx);

    const items = await ctx.db
      .query("recurringExpenses")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    const categoryMap = new Map(categories.map((c) => [c._id, c]));

    return items
      .map((r) => {
        const cat = categoryMap.get(r.categoryId);
        return {
          _id: r._id,
          categoryId: r.categoryId,
          description: r.description,
          amount: r.amount,
          frequency: r.frequency,
          nextDueDate: r.nextDueDate,
          isActive: r.isActive,
          categoryName: cat?.name ?? "Unknown",
          categoryNameUr: cat?.nameUr ?? "نامعلوم",
          categoryIcon: cat?.icon ?? "📦",
        };
      })
      .sort((a, b) => a.nextDueDate - b.nextDueDate);
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────────

async function assertCategoryOwned(
  ctx: MutationCtx,
  userId: Id<"users">,
  categoryId: Id<"categories">,
) {
  const category = await ctx.db.get(categoryId);
  if (!category || category.userId !== userId) {
    throw new Error("Category not found or does not belong to this user.");
  }
}

/**
 * Create a recurring expense. Validates amount, description, category ownership,
 * and a finite due date.
 */
export const create = mutation({
  args: {
    categoryId: v.id("categories"),
    description: v.string(),
    amount: v.number(),
    frequency: frequencyValidator,
    nextDueDate: v.number(),
  },
  handler: async (ctx: MutationCtx, args: CreateArgs) => {
    const user = await requireUser(ctx);

    if (!args.description.trim()) {
      throw new Error("Description cannot be empty.");
    }
    if (!(args.amount > 0)) {
      throw new Error("Amount must be greater than zero.");
    }
    if (!Number.isFinite(args.nextDueDate)) {
      throw new Error("Next due date is invalid.");
    }
    await assertCategoryOwned(ctx, user._id, args.categoryId);

    return await ctx.db.insert("recurringExpenses", {
      userId: user._id,
      categoryId: args.categoryId,
      description: args.description.trim(),
      amount: args.amount,
      frequency: args.frequency,
      nextDueDate: args.nextDueDate,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update a recurring expense. Ownership-checked; each provided field is validated.
 */
export const update = mutation({
  args: {
    id: v.id("recurringExpenses"),
    categoryId: v.optional(v.id("categories")),
    description: v.optional(v.string()),
    amount: v.optional(v.number()),
    frequency: v.optional(frequencyValidator),
    nextDueDate: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx: MutationCtx, args: UpdateArgs) => {
    const user = await requireUser(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== user._id) {
      throw new Error("Recurring expense not found or does not belong to this user.");
    }

    if (args.description !== undefined && !args.description.trim()) {
      throw new Error("Description cannot be empty.");
    }
    if (args.amount !== undefined && !(args.amount > 0)) {
      throw new Error("Amount must be greater than zero.");
    }
    if (args.nextDueDate !== undefined && !Number.isFinite(args.nextDueDate)) {
      throw new Error("Next due date is invalid.");
    }
    if (args.categoryId !== undefined) {
      await assertCategoryOwned(ctx, user._id, args.categoryId);
    }

    const updates: Record<string, unknown> = {};
    if (args.categoryId !== undefined) updates.categoryId = args.categoryId;
    if (args.description !== undefined)
      updates.description = args.description.trim();
    if (args.amount !== undefined) updates.amount = args.amount;
    if (args.frequency !== undefined) updates.frequency = args.frequency;
    if (args.nextDueDate !== undefined) updates.nextDueDate = args.nextDueDate;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.id, updates);
  },
});

/**
 * Delete a recurring expense. Ownership-checked.
 */
export const remove = mutation({
  args: { id: v.id("recurringExpenses") },
  handler: async (ctx: MutationCtx, args: RemoveArgs) => {
    const user = await requireUser(ctx);

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== user._id) {
      throw new Error("Recurring expense not found or does not belong to this user.");
    }

    await ctx.db.delete(args.id);
  },
});

/**
 * Mark a recurring bill paid for its current cycle:
 *  - advances `nextDueDate` by one interval of its frequency
 *  - optionally logs the payment as an expense transaction (dated to the cycle
 *    that was just paid)
 *
 * One mutation ⇒ atomic: the transaction and the date bump commit together.
 */
export const markPaid = mutation({
  args: {
    id: v.id("recurringExpenses"),
    logExpense: v.boolean(),
  },
  handler: async (ctx: MutationCtx, args: MarkPaidArgs) => {
    const user = await requireUser(ctx);

    const bill = await ctx.db.get(args.id);
    if (!bill || bill.userId !== user._id) {
      throw new Error("Recurring expense not found or does not belong to this user.");
    }

    const paidForDate = bill.nextDueDate;
    const next = advanceDueDate(bill.nextDueDate, bill.frequency);

    if (args.logExpense) {
      const now = Date.now();
      await ctx.db.insert("transactions", {
        userId: user._id,
        type: "expense",
        amount: bill.amount,
        categoryId: bill.categoryId,
        description: bill.description,
        date: paidForDate,
        source: "manual",
        isRecurring: true,
        recurringExpenseId: bill._id,
        pendingConfirmation: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(args.id, { nextDueDate: next });

    return { nextDueDate: next };
  },
});
