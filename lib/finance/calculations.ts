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
