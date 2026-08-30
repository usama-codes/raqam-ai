// lib/ai/context-builder.ts — Assembles structured financial context for the AI
// This module runs inside a Convex action and reads data via ctx.runQuery.

import {
  calculateDailyExpenseAverage,
  calculateDaysRemainingInMonth,
  detectCategoryAnomalies,
  goalCompletionDate,
} from "@/lib/finance/calculations";
import { projectEndOfMonth, whatIfScenario } from "@/lib/finance/projections";

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
  intelligence: {
    dailyExpenseAverage: number;
    daysRemaining: number;
    daysElapsed: number;
    projectedEndOfMonth: number;
    anomalies: Array<{
      name: string;
      nameUr: string;
      average: number;
      currentSpend: number;
      deviationPercent: number;
    }>;
    whatIfOptions: Array<{
      categoryName: string;
      categoryNameUr: string;
      currentSpend: number;
      savingsAt30Percent: number;
    }>;
    goalProjections: Array<{
      name: string;
      nameUr?: string;
      monthsToComplete: number | null;
      completionDate: string | null;
    }>;
    historicalMonths: Array<{
      month: number;
      income: number;
      expenses: number;
      savingsRate: number;
    }>;
  };
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

  // 4. Get intelligence data (3-month history for projections & anomalies)
  let intelligenceData: {
    currentMonth: {
      income: number;
      expenses: number;
      daysElapsed: number;
      totalDaysInMonth: number;
    };
    historicalMonths: Array<{
      month: number;
      income: number;
      expenses: number;
      netSavings: number;
      savingsRate: number;
    }>;
    currentCategorySpending: Array<{
      categoryId: string;
      name: string;
      nameUr: string;
      amount: number;
    }>;
    categoryRollingAverages: Array<{
      categoryId: string;
      name: string;
      nameUr: string;
      average: number;
      currentSpend: number;
    }>;
  } | null = null;

  try {
    intelligenceData = await ctx.runQuery(
      anyApi.summary.getIntelligenceData,
      {},
    );
  } catch {
    // Intelligence data may not be available
  }

  // 5. Compute intelligence
  const defaultIntelligence: FinancialContext["intelligence"] = {
    dailyExpenseAverage: 0,
    daysRemaining: 0,
    daysElapsed: 0,
    projectedEndOfMonth: summary.netSavings,
    anomalies: [],
    whatIfOptions: [],
    goalProjections: [],
    historicalMonths: [],
  };

  let intelligence = defaultIntelligence;

  if (intelligenceData) {
    const { daysElapsed, totalDaysInMonth } = intelligenceData.currentMonth;
    const daysRemaining = calculateDaysRemainingInMonth(
      daysElapsed,
      totalDaysInMonth,
    );
    const dailyAvg = calculateDailyExpenseAverage(
      intelligenceData.currentMonth.expenses,
      daysElapsed,
    );
    const currentBalance = summary.netSavings;
    const projected = projectEndOfMonth(
      currentBalance,
      dailyAvg,
      daysRemaining,
    );

    // Detect anomalies from rolling averages
    const anomalies = detectCategoryAnomalies(
      intelligenceData.categoryRollingAverages,
    );

    // What-if scenarios for top expense categories
    const whatIfOptions = intelligenceData.currentCategorySpending
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((cat) => ({
        categoryName: cat.name,
        categoryNameUr: cat.nameUr,
        currentSpend: cat.amount,
        savingsAt30Percent: whatIfScenario(
          summary.totalExpenses,
          cat.amount,
          30,
        ),
      }));

    // Goal projections — use average monthly savings from last 3 months
    const avgMonthlySavings =
      intelligenceData.historicalMonths.length > 0
        ? intelligenceData.historicalMonths.reduce(
            (sum, m) => sum + m.netSavings,
            0,
          ) / intelligenceData.historicalMonths.length
        : summary.netSavings;

    const goalProjections = goals.map((g) => {
      const months =
        avgMonthlySavings > 0
          ? Math.ceil(
              Math.max(0, g.targetAmount - g.currentAmount) / avgMonthlySavings,
            )
          : null;
      return {
        name: g.name,
        nameUr: g.nameUr,
        monthsToComplete: months,
        completionDate: goalCompletionDate(
          g.targetAmount,
          g.currentAmount,
          avgMonthlySavings,
        ),
      };
    });

    intelligence = {
      dailyExpenseAverage: Math.round(dailyAvg),
      daysRemaining,
      daysElapsed,
      projectedEndOfMonth: Math.round(projected),
      anomalies,
      whatIfOptions,
      goalProjections,
      historicalMonths: intelligenceData.historicalMonths,
    };
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
    intelligence,
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

  // Intelligence section
  const intel = ctx.intelligence;
  if (intel && (intel.dailyExpenseAverage > 0 || intel.anomalies.length > 0)) {
    lines.push("\n### Financial Intelligence");

    if (intel.dailyExpenseAverage > 0) {
      lines.push(
        `\n- Daily average expense: Rs. ${intel.dailyExpenseAverage.toLocaleString()}`,
      );
      lines.push(
        `- Projected end-of-month balance: Rs. ${intel.projectedEndOfMonth.toLocaleString()} (${intel.daysRemaining} days remaining)`,
      );
    }

    if (intel.historicalMonths.length > 0) {
      const histWithExpenses = intel.historicalMonths.filter(
        (h) => h.expenses > 0,
      );
      if (histWithExpenses.length > 0) {
        lines.push("\n#### Historical Spending (previous months)");
        for (const h of intel.historicalMonths) {
          if (h.expenses === 0) continue;
          const monthName = new Date(h.month).toLocaleString("en", {
            month: "long",
          });
          lines.push(
            `- ${monthName}: Income Rs. ${h.income.toLocaleString()}, Expenses Rs. ${h.expenses.toLocaleString()}, Savings Rate ${h.savingsRate.toFixed(1)}%`,
          );
        }
      }
    }

    if (intel.anomalies.length > 0) {
      lines.push("\n#### Spending Anomalies Detected");
      for (const a of intel.anomalies) {
        lines.push(
          `- ${a.nameUr} (${a.name}): Rs. ${a.currentSpend.toLocaleString()} vs avg Rs. ${a.average.toLocaleString()} (${a.deviationPercent}% above average)`,
        );
      }
    }

    if (intel.whatIfOptions.length > 0) {
      lines.push("\n#### What-if Scenarios (30% reduction)");
      for (const w of intel.whatIfOptions) {
        lines.push(
          `- Reduce ${w.categoryNameUr} by 30%: projected total Rs. ${Math.round(w.savingsAt30Percent).toLocaleString()}`,
        );
      }
    }

    if (intel.goalProjections.length > 0) {
      lines.push("\n#### Goal Timeline Projections");
      for (const g of intel.goalProjections) {
        if (g.monthsToComplete !== null && g.completionDate) {
          lines.push(
            `- ${g.nameUr ?? g.name}: ~${g.monthsToComplete} months (est. ${g.completionDate})`,
          );
        } else {
          lines.push(
            `- ${g.nameUr ?? g.name}: Not achievable with current savings rate`,
          );
        }
      }
    }
  }

  return lines.join("\n");
}
