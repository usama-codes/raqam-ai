import { query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";
import type { Id } from "./_generated/dataModel";

// ─── Arg types ──────────────────────────────────────────────────────────────────

type SummaryArgs = { month?: number };

// ─── Queries ────────────────────────────────────────────────────────────────────

/**
 * Computes a financial summary for the authenticated user's current month.
 * Includes: total income, total expenses, net savings, savings rate,
 * category spending breakdown, recent transactions, and upcoming bills.
 */
export const getFinancialSummary = query({
  args: { month: v.optional(v.number()) },
  handler: async (ctx: QueryCtx, args: SummaryArgs) => {
    const user = await requireUser(ctx);
    const month = args.month ?? getFirstOfMonth();

    // Compute month boundaries
    const monthEnd = new Date(month);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    const monthEndMs = monthEnd.getTime();

    // Fetch all transactions for this month
    const allTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", user._id).gte("date", month).lt("date", monthEndMs),
      )
      .collect();

    // Compute totals
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of allTransactions) {
      if (t.type === "income") totalIncome += t.amount;
      else totalExpenses += t.amount;
    }

    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Category breakdown for expenses
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const categoryMap = new Map<Id<"categories">, (typeof categories)[number]>(
      categories.map((c) => [c._id, c]),
    );

    const expenseByCategory = new Map<string, number>();
    for (const t of allTransactions) {
      if (t.type === "expense") {
        expenseByCategory.set(
          t.categoryId,
          (expenseByCategory.get(t.categoryId) ?? 0) + t.amount,
        );
      }
    }

    const categoryBreakdown = Array.from(expenseByCategory.entries()).map(
      ([catId, amount]) => {
        const cat = categoryMap.get(catId as Id<"categories">);
        return {
          categoryId: catId,
          name: cat?.name ?? "Unknown",
          nameUr: cat?.nameUr ?? "نامعلوم",
          icon: cat?.icon ?? "📦",
          color: cat?.color ?? "#6b7280",
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        };
      },
    );

    // Recent transactions (last 5 of this month, newest first)
    const sortedMonthTx = [...allTransactions].sort(
      (a, b) => b.createdAt - a.createdAt,
    );
    const recentTx = sortedMonthTx.slice(0, 5);

    const recentTransactions = recentTx.map((t) => {
      const cat = categoryMap.get(t.categoryId);
      const date = new Date(t.date);
      const formattedDate = date.toLocaleDateString("ur-PK", {
        month: "short",
        day: "numeric",
      });
      return {
        id: t._id,
        icon: cat?.icon ?? "📦",
        label: t.description ?? t.descriptionUr ?? cat?.nameUr ?? "لین دین",
        meta: formattedDate,
        amount: t.amount,
        type: t.type as "income" | "expense",
      };
    });

    // Upcoming bills (active recurring expenses due within 7 days)
    const now = Date.now();
    const sevenDays = now + 7 * 24 * 60 * 60 * 1000;

    const recurring = await ctx.db
      .query("recurringExpenses")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("isActive"), true),
          q.gte(q.field("nextDueDate"), now),
          q.lte(q.field("nextDueDate"), sevenDays),
        ),
      )
      .collect();

    // Group by category and sum
    const billsMap = new Map<string, number>();
    for (const r of recurring) {
      const cat = categoryMap.get(r.categoryId);
      const label = r.description || cat?.nameUr || "بل";
      billsMap.set(label, (billsMap.get(label) ?? 0) + r.amount);
    }

    const upcomingBills = Array.from(billsMap.entries()).map(
      ([label, amount]) => ({
        label,
        amount: amount.toString(),
      }),
    );

    return {
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      categoryBreakdown,
      recentTransactions,
      upcomingBills,
    };
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getFirstOfMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}
