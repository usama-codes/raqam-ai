"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

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

// ─── Raw shape returned by Convex query ──────────────────────────────────────────

interface RawSummaryData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  categoryBreakdown: {
    categoryId: string;
    name: string;
    nameUr: string;
    icon: string;
    color: string;
    amount: number;
    percentage: number;
  }[];
  recentTransactions: {
    id: string;
    icon: string;
    label: string;
    meta: string;
    amount: number;
    type: "income" | "expense";
  }[];
  upcomingBills: {
    label: string;
    amount: string;
  }[];
}

// ─── Hook return type ────────────────────────────────────────────────────────────

export interface UseFinancialSummaryReturn {
  summary: FinancialSummary | null;
  loading: boolean;
  error: Error | null;
}

// ─── Hook (Phase 4: wired to Convex) ─────────────────────────────────────────────

export function useFinancialSummary(): UseFinancialSummaryReturn {
  // Explicit type avoids IDE failure to resolve the deep FilterApi generic chain
  // in the generated api.d.ts (tsc resolves correctly, but IDE TS server may not).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawSummary = useQuery((api as any).summary.getFinancialSummary, {}) as
    RawSummaryData | undefined;

  const summary: FinancialSummary | null = React.useMemo(() => {
    if (!rawSummary) return null;
    return {
      totalIncome: rawSummary.totalIncome,
      totalExpenses: rawSummary.totalExpenses,
      netSavings: rawSummary.netSavings,
      savingsRate: rawSummary.savingsRate,
      categoryBreakdown: rawSummary.categoryBreakdown.map((c) => ({
        categoryId: c.categoryId,
        name: c.name,
        nameUr: c.nameUr,
        icon: c.icon,
        color: c.color,
        amount: c.amount,
        percentage: c.percentage,
      })),
      recentTransactions: rawSummary.recentTransactions.map((t) => ({
        id: t.id,
        icon: t.icon,
        label: t.label,
        meta: t.meta,
        amount: t.amount,
        type: t.type,
      })),
      upcomingBills: rawSummary.upcomingBills.map((b) => ({
        label: b.label,
        amount: b.amount,
      })),
    };
  }, [rawSummary]);

  return {
    summary,
    loading: rawSummary === undefined,
    error: null,
  };
}
