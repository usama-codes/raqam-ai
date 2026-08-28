"use client";

import * as React from "react";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  month: number; // Unix ms for first of month
  totalLimit?: number;
}

export interface BudgetCategory {
  id: string;
  budgetId: string;
  categoryId: string;
  limit: number;
  spent: number;
}

// ─── Hook return type ────────────────────────────────────────────────────────────

export interface UseBudgetsReturn {
  budget: Budget | null;
  budgetCategories: BudgetCategory[];
  loading: boolean;
  error: Error | null;
  createBudget: (month: number, totalLimit?: number) => Promise<void>;
  upsertBudgetCategory: (categoryId: string, limit: number) => Promise<void>;
  deleteBudgetCategory: (categoryId: string) => Promise<void>;
}

// ─── Hook (Phase 2: returns empty data; Convex wired in Phase 4) ─────────────────

export function useBudgets(month?: number): UseBudgetsReturn {
  void month; // Will be used when Convex is connected

  const createBudget = React.useCallback(
    async (_month: number, _totalLimit?: number): Promise<void> => {
      // No-op until Convex is connected in Phase 4
    },
    [],
  );

  const upsertBudgetCategory = React.useCallback(
    async (_categoryId: string, _limit: number): Promise<void> => {
      // No-op until Convex is connected in Phase 4
    },
    [],
  );

  const deleteBudgetCategory = React.useCallback(
    async (_categoryId: string): Promise<void> => {
      // No-op until Convex is connected in Phase 4
    },
    [],
  );

  return {
    budget: null,
    budgetCategories: [],
    loading: false,
    error: null,
    createBudget,
    upsertBudgetCategory,
    deleteBudgetCategory,
  };
}
