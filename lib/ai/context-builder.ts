// lib/ai/context-builder.ts — Assembles structured financial context for the AI
// This module runs inside a Convex action and reads data via ctx.runQuery.

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface FinancialContext {
  currentMonth: {
    income: number;
    expenses: number;
    netSavings: number;
    savingsRate: number;
    categoryBreakdown: Array<{
      name: string;
      nameUr: string;
      amount: number;
      percentage: number;
    }>;
    recentTransactions: Array<{
      label: string;
      amount: number;
      type: "income" | "expense";
      meta: string;
    }>;
  };
  budgets: Array<{
    categoryName: string;
    categoryNameUr: string;
    limit: number;
    spent: number;
    utilization: number;
  }>;
  goals: Array<{
    name: string;
    nameUr?: string;
    targetAmount: number;
    currentAmount: number;
    isCompleted: boolean;
  }>;
  upcomingBills: Array<{
    label: string;
    amount: string;
  }>;
}

// ─── Builder ────────────────────────────────────────────────────────────────────

/**
 * Minimal interface for the action context — just need runQuery.
 */
interface ActionContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runQuery(query: any, args: any): Promise<any>;
}

/**
 * Fetches and assembles the user's financial context from Convex.
 * Designed to run inside a Convex action using ctx.runQuery.
 */
export async function buildFinancialContext(
  ctx: ActionContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api: any,
): Promise<FinancialContext> {
  // 1. Get financial summary (current month)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyApi = api as any;

  const summary = await ctx.runQuery(anyApi.summary.getFinancialSummary, {});

  // 2. Get budget data
  let budgets: FinancialContext["budgets"] = [];
  try {
    const budget = await ctx.runQuery(anyApi.budgets.get, {});
    if (budget) {
      const budgetCategories = await ctx.runQuery(
        anyApi.budgets.getBudgetCategories,
        { budgetId: budget._id },
      );
      budgets = (budgetCategories ?? []).map(
        (bc: {
          categoryName?: string;
          categoryNameUr?: string;
          nameUr?: string;
          name?: string;
          limit: number;
          spent: number;
        }) => ({
          categoryName: bc.categoryName ?? bc.name ?? "Unknown",
          categoryNameUr: bc.categoryNameUr ?? bc.nameUr ?? "نامعلوم",
          limit: bc.limit,
          spent: bc.spent,
          utilization: bc.limit > 0 ? (bc.spent / bc.limit) * 100 : 0,
        }),
      );
    }
  } catch {
    // Budget data may not exist yet — that's fine
  }

  // 3. Get savings goals
  let goals: FinancialContext["goals"] = [];
  try {
    const rawGoals = await ctx.runQuery(anyApi.goals.list, {});
    goals = (rawGoals ?? []).map(
      (g: {
        name: string;
        nameUr?: string;
        targetAmount: number;
        currentAmount: number;
        isCompleted: boolean;
      }) => ({
        name: g.name,
        nameUr: g.nameUr,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        isCompleted: g.isCompleted,
      }),
    );
  } catch {
    // Goals may not exist yet
  }

  return {
    currentMonth: {
      income: summary.totalIncome,
      expenses: summary.totalExpenses,
      netSavings: summary.netSavings,
      savingsRate: summary.savingsRate,
      categoryBreakdown: summary.categoryBreakdown,
      recentTransactions: summary.recentTransactions,
    },
    budgets,
    goals,
    upcomingBills: summary.upcomingBills,
  };
}

/**
 * Formats the financial context into a human-readable text block
 * suitable for inclusion in an AI prompt.
 */
export function formatContextForPrompt(ctx: FinancialContext): string {
  const lines: string[] = [];

  // Current month summary
  lines.push("## Current Month Summary");
  lines.push(`- Total Income: Rs. ${ctx.currentMonth.income.toLocaleString()}`);
  lines.push(
    `- Total Expenses: Rs. ${ctx.currentMonth.expenses.toLocaleString()}`,
  );
  lines.push(
    `- Net Savings: Rs. ${ctx.currentMonth.netSavings.toLocaleString()}`,
  );
  lines.push(`- Savings Rate: ${ctx.currentMonth.savingsRate.toFixed(1)}%`);

  // Category breakdown
  if (ctx.currentMonth.categoryBreakdown.length > 0) {
    lines.push("\n### Spending by Category");
    for (const cat of ctx.currentMonth.categoryBreakdown) {
      lines.push(
        `- ${cat.nameUr} (${cat.name}): Rs. ${cat.amount.toLocaleString()} (${cat.percentage.toFixed(1)}%)`,
      );
    }
  }

  // Recent transactions
  if (ctx.currentMonth.recentTransactions.length > 0) {
    lines.push("\n### Recent Transactions");
    for (const tx of ctx.currentMonth.recentTransactions) {
      lines.push(
        `- ${tx.label}: Rs. ${tx.amount.toLocaleString()} (${tx.type}) — ${tx.meta}`,
      );
    }
  }

  // Budgets
  if (ctx.budgets.length > 0) {
    lines.push("\n### Budget Status");
    for (const b of ctx.budgets) {
      lines.push(
        `- ${b.categoryNameUr}: Rs. ${b.spent.toLocaleString()} / Rs. ${b.limit.toLocaleString()} (${b.utilization.toFixed(0)}% used)`,
      );
    }
  }

  // Goals
  if (ctx.goals.length > 0) {
    lines.push("\n### Savings Goals");
    for (const g of ctx.goals) {
      const pct =
        g.targetAmount > 0
          ? ((g.currentAmount / g.targetAmount) * 100).toFixed(0)
          : "0";
      lines.push(
        `- ${g.nameUr ?? g.name}: Rs. ${g.currentAmount.toLocaleString()} / Rs. ${g.targetAmount.toLocaleString()} (${pct}%)${g.isCompleted ? " ✅" : ""}`,
      );
    }
  }

  // Upcoming bills
  if (ctx.upcomingBills.length > 0) {
    lines.push("\n### Upcoming Bills (next 7 days)");
    for (const b of ctx.upcomingBills) {
      lines.push(`- ${b.label}: Rs. ${b.amount}`);
    }
  }

  return lines.join("\n");
}
