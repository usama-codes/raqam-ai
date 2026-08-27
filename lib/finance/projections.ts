// lib/finance/projections.ts — Financial projections (pure functions)

/**
 * Project end-of-month balance based on current balance and daily average spending.
 * @param currentBalance - Current balance in PKR
 * @param dailyAvgExpense - Average daily expense in PKR
 * @param daysRemaining - Days remaining in the month
 */
export function projectEndOfMonth(
  currentBalance: number,
  dailyAvgExpense: number,
  daysRemaining: number,
): number {
  return currentBalance - dailyAvgExpense * daysRemaining;
}

/**
 * Calculate a what-if scenario: what if I reduce spending in a category by X%?
 * @param currentExpenses - Current total monthly expenses
 * @param categoryExpenses - Current spending in the target category
 * @param reductionPercent - Percentage reduction (0-100)
 * @returns New projected total expenses
 */
export function whatIfScenario(
  currentExpenses: number,
  categoryExpenses: number,
  reductionPercent: number,
): number {
  const savings = categoryExpenses * (reductionPercent / 100);
  return currentExpenses - savings;
}

/**
 * Estimate how many months until a savings goal is reached.
 * @param targetAmount - Goal target in PKR
 * @param currentAmount - Current saved amount in PKR
 * @param monthlySavings - Average monthly savings in PKR
 * @returns Number of months (rounded up), or Infinity if monthlySavings <= 0
 */
export function monthsToGoal(
  targetAmount: number,
  currentAmount: number,
  monthlySavings: number,
): number {
  if (monthlySavings <= 0) return Infinity;
  const remaining = targetAmount - currentAmount;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / monthlySavings);
}
