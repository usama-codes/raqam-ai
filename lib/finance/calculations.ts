// lib/finance/calculations.ts — Deterministic financial calculations (pure functions)
// These operate on typed data structures. Convex integration happens in Phase 4.

/**
 * Calculate total balance from income and expenses.
 */
export function calculateBalance(
  transactions: Array<{ type: "income" | "expense"; amount: number }>,
): number {
  return transactions.reduce((balance, tx) => {
    return tx.type === "income" ? balance + tx.amount : balance - tx.amount;
  }, 0);
}

/**
 * Calculate total income from a set of transactions.
 */
export function calculateTotalIncome(
  transactions: Array<{ type: "income" | "expense"; amount: number }>,
): number {
  return transactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Calculate total expenses from a set of transactions.
 */
export function calculateTotalExpenses(
  transactions: Array<{ type: "income" | "expense"; amount: number }>,
): number {
  return transactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Calculate savings rate as a percentage.
 * Returns 0 if income is 0.
 */
export function calculateSavingsRate(income: number, expenses: number): number {
  if (income === 0) return 0;
  return ((income - expenses) / income) * 100;
}

/**
 * Calculate budget utilization percentage for a category.
 * Returns 0 if limit is 0.
 */
export function calculateBudgetUtilization(
  spent: number,
  limit: number,
): number {
  if (limit === 0) return 0;
  return (spent / limit) * 100;
}

/**
 * Classify a category's budget utilisation into an alert severity.
 * Shared by the transaction-entry toast and the dashboard proactive alert card
 * so the two never drift apart.
 *
 * - `< 80%`  → "none"
 * - `80–99%` → "warning"
 * - `>= 100%` → "over"
 *
 * Returns "none" when there is no limit to measure against.
 */
export function budgetThresholdSeverity(
  spent: number,
  limit: number,
): "none" | "warning" | "over" {
  if (limit <= 0) return "none";
  const pct = (spent / limit) * 100;
  if (pct >= 100) return "over";
  if (pct >= 80) return "warning";
  return "none";
}

/**
 * Sum transactions for a specific category.
 */
export function sumByCategory(
  transactions: Array<{
    categoryId: string;
    amount: number;
    type: "income" | "expense";
  }>,
  categoryId: string,
): number {
  return transactions
    .filter((tx) => tx.categoryId === categoryId && tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Calculate average daily expense for the current month.
 * Returns 0 if no days have elapsed or no expenses.
 */
export function calculateDailyExpenseAverage(
  totalExpenses: number,
  daysElapsed: number,
): number {
  if (daysElapsed <= 0) return 0;
  return totalExpenses / daysElapsed;
}

/**
 * Calculate days remaining in the current month.
 */
export function calculateDaysRemainingInMonth(
  daysElapsed: number,
  totalDaysInMonth: number,
): number {
  return Math.max(0, totalDaysInMonth - daysElapsed);
}

/**
 * Detect anomalies across all categories using rolling averages.
 * Returns categories where current spending deviates from the rolling average
 * by more than the threshold (default 30%).
 */
export function detectCategoryAnomalies(
  categoryAverages: Array<{
    name: string;
    nameUr: string;
    average: number;
    currentSpend: number;
  }>,
  threshold: number = 0.3,
): Array<{
  name: string;
  nameUr: string;
  average: number;
  currentSpend: number;
  deviationPercent: number;
}> {
  const anomalies: Array<{
    name: string;
    nameUr: string;
    average: number;
    currentSpend: number;
    deviationPercent: number;
  }> = [];

  for (const cat of categoryAverages) {
    if (cat.average === 0) continue;
    const deviation = (cat.currentSpend - cat.average) / cat.average;
    if (deviation >= threshold) {
      anomalies.push({
        name: cat.name,
        nameUr: cat.nameUr,
        average: Math.round(cat.average),
        currentSpend: cat.currentSpend,
        deviationPercent: Math.round(deviation * 100),
      });
    }
  }

  return anomalies;
}

/**
 * Estimate the date when a savings goal will be reached.
 * @returns ISO date string, or null if unreachable (monthlySavings <= 0)
 */
export function goalCompletionDate(
  targetAmount: number,
  currentAmount: number,
  monthlySavings: number,
): string | null {
  if (monthlySavings <= 0) return null;
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return new Date().toISOString().split("T")[0];
  const months = Math.ceil(remaining / monthlySavings);
  const target = new Date();
  target.setMonth(target.getMonth() + months);
  return target.toISOString().split("T")[0];
}

/**
 * Determine whether the user can afford a purchase of the given amount.
 * Returns a structured result with the reasoning data.
 */
export function canAfford(
  purchaseAmount: number,
  currentIncome: number,
  currentExpenses: number,
  projectedEndOfMonth: number,
): {
  affordable: boolean;
  currentNetSavings: number;
  projectedEndOfMonth: number;
  impactPercent: number;
} {
  const currentNetSavings = currentIncome - currentExpenses;
  const affordable = projectedEndOfMonth - purchaseAmount >= 0;
  const impactPercent =
    currentIncome > 0 ? (purchaseAmount / currentIncome) * 100 : 0;

  return {
    affordable,
    currentNetSavings,
    projectedEndOfMonth,
    impactPercent: Math.round(impactPercent * 10) / 10,
  };
}
