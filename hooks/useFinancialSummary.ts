"use client";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface CategorySpending {
  categoryId: string;
  name: string;
  nameUr: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  categoryBreakdown: CategorySpending[];
  recentTransactions: RecentTransactionSummary[];
  upcomingBills: UpcomingBill[];
}

export interface RecentTransactionSummary {
  id: string;
  icon: string;
  label: string;
  meta: string;
  amount: number;
  type: "income" | "expense";
}

export interface UpcomingBill {
  label: string;
  amount: string;
}

// ─── Hook return type ────────────────────────────────────────────────────────────

export interface UseFinancialSummaryReturn {
  summary: FinancialSummary | null;
  loading: boolean;
  error: Error | null;
}

// ─── Hook (Phase 2: returns null summary; Convex wired in Phase 4) ───────────────

export function useFinancialSummary(): UseFinancialSummaryReturn {
  return {
    summary: null,
    loading: false,
    error: null,
  };
}
