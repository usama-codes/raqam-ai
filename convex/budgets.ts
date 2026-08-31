import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";

// ─── Queries ────────────────────────────────────────────────────────────────────

/**
 * Get the budget for a specific month (or current month if not specified).
 * Returns null if no budget exists for the month.
 */
export const get = query({
  args: { month: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const month = args.month ?? getFirstOfMonth();

    const budget = await ctx.db
      .query("budgets")
      .withIndex("by_userId_month", (q) =>
        q.eq("userId", user._id).eq("month", month),
      )
      .first();

    return budget ?? null;
  },
});

/**
 * Get all budget categories for a specific budget, enriched with spent amounts
 * computed from real transactions in the budget month.
 */
export const getBudgetCategories = query({
  args: { budgetId: v.id("budgets") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // A reactive client can briefly hold a budget id that has just been deleted
    // or replaced (e.g. a re-seed). Return an empty list rather than throwing —
    // no data is leaked either way, and the UI renders "no categories" cleanly.
    const budget = await ctx.db.get(args.budgetId);
    if (!budget || budget.userId !== user._id) {
      return [];
    }

    const budgetCats = await ctx.db
      .query("budgetCategories")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .collect();

    // Compute month boundaries for spent calculation
    const monthStart = budget.month;
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    const monthEndMs = monthEnd.getTime();

    // Resolve category details for display (name, nameUr, icon)
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    const categoryMap = new Map(categories.map((c) => [c._id, c]));

    const result = [];
    for (const bc of budgetCats) {
      const cat = categoryMap.get(bc.categoryId);

      // Sum transactions for this category in this budget month
      const transactions = await ctx.db
        .query("transactions")
        .withIndex("by_userId_category", (q) =>
          q.eq("userId", user._id).eq("categoryId", bc.categoryId),
        )
        .collect();

      const spent = transactions
        .filter(
          (t) =>
            t.type === "expense" && t.date >= monthStart && t.date < monthEndMs,
        )
        .reduce((sum, t) => sum + t.amount, 0);

      result.push({
        ...bc,
        spent,
        categoryName: cat?.name ?? "Unknown",
        categoryNameUr: cat?.nameUr ?? "نامعلوم",
        categoryIcon: cat?.icon ?? "📦",
      });
    }

    return result;
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────────

/**
 * Create a new budget for a month. Throws if budget already exists for that month.
 */
export const create = mutation({
  args: {
    month: v.number(),
    totalLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Validate totalLimit if provided
    if (args.totalLimit !== undefined && args.totalLimit <= 0) {
      throw new Error("Total budget limit must be greater than zero.");
    }

    // Check if budget already exists for this month
    const existing = await ctx.db
      .query("budgets")
      .withIndex("by_userId_month", (q) =>
        q.eq("userId", user._id).eq("month", args.month),
      )
      .first();

    if (existing) {
      throw new Error("A budget already exists for this month.");
    }

    const now = Date.now();
    return await ctx.db.insert("budgets", {
      userId: user._id,
      month: args.month,
      totalLimit: args.totalLimit,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Create or update a budget category limit within a budget.
 */
export const upsertCategory = mutation({
  args: {
    budgetId: v.id("budgets"),
    categoryId: v.id("categories"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Validate budget ownership
    const budget = await ctx.db.get(args.budgetId);
    if (!budget || budget.userId !== user._id) {
      throw new Error("Budget not found or does not belong to this user.");
    }

    // Validate category ownership
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.userId !== user._id) {
      throw new Error("Category not found or does not belong to this user.");
    }

    // Validate limit
    if (args.limit <= 0) {
      throw new Error("Category budget limit must be greater than zero.");
    }

    // Check for existing budget category
    const existing = await ctx.db
      .query("budgetCategories")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", args.budgetId))
      .filter((q) => q.eq(q.field("categoryId"), args.categoryId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        limit: args.limit,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("budgetCategories", {
      budgetId: args.budgetId,
      userId: user._id,
      categoryId: args.categoryId,
      limit: args.limit,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Delete a budget category. Validates ownership.
 */
export const deleteCategory = mutation({
  args: { id: v.id("budgetCategories") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const bc = await ctx.db.get(args.id);
    if (!bc || bc.userId !== user._id) {
      throw new Error(
        "Budget category not found or does not belong to this user.",
      );
    }

    await ctx.db.delete(args.id);
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getFirstOfMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}
