// lib/finance/month-summary.ts — Deterministic monthly recap (pure function)
//
// Builds the "پچھلے مہینے کا خلاصہ" card content. No LLM — every figure is
// summed from real transactions (AGENTS.md P2: AI must be grounded in user data;
// this card doesn't even involve the AI).

export interface SummaryTxn {
  type: "income" | "expense";
  amount: number;
  categoryId: string;
}

export interface CategoryMeta {
  name: string;
  nameUr: string;
  icon: string;
}

export interface TopCategory {
  categoryId: string;
  name: string;
  nameUr: string;
  icon: string;
  amount: number;
}

export interface MonthSummary {
  income: number;
  expenses: number;
  net: number;
  savingsRate: number; // percentage, 0 when income is 0
  topCategories: TopCategory[]; // up to 3, descending by amount
  /** % change in total expenses vs the prior month. null when there is no prior expense data. */
  expenseDeltaPct: number | null;
}

function sumExpenses(txns: SummaryTxn[]): number {
  return txns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
}

/**
 * @param monthTxns       transactions dated within the month being summarised
 * @param priorMonthTxns  transactions dated within the month before that
 * @param categoryMeta    id → { name, nameUr, icon }
 */
export function summarizeMonth(
  monthTxns: SummaryTxn[],
  priorMonthTxns: SummaryTxn[],
  categoryMeta: Map<string, CategoryMeta>,
): MonthSummary {
  let income = 0;
  let expenses = 0;
  const byCategory = new Map<string, number>();

  for (const t of monthTxns) {
    if (t.type === "income") {
      income += t.amount;
    } else {
      expenses += t.amount;
      byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + t.amount);
    }
  }

  const net = income - expenses;
  const savingsRate = income > 0 ? (net / income) * 100 : 0;

  const topCategories: TopCategory[] = Array.from(byCategory.entries())
    .map(([categoryId, amount]) => {
      const meta = categoryMeta.get(categoryId);
      return {
        categoryId,
        name: meta?.name ?? "Unknown",
        nameUr: meta?.nameUr ?? "نامعلوم",
        icon: meta?.icon ?? "📦",
        amount,
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  const priorExpenses = sumExpenses(priorMonthTxns);
  const expenseDeltaPct =
    priorExpenses > 0
      ? Math.round(((expenses - priorExpenses) / priorExpenses) * 100)
      : null;

  return {
    income,
    expenses,
    net,
    savingsRate: Math.round(savingsRate * 10) / 10,
    topCategories,
    expenseDeltaPct,
  };
}
