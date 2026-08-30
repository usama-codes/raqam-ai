"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// ─── Raw Convex document shapes (needed because `api as any` erases inference) ──

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface RawBudgetDoc {
  _id: string;
  month: number;
  totalLimit?: number;
}

interface RawBudgetCategoryDoc {
  _id: string;
  budgetId: string;
  categoryId: string;
  limit: number;
  spent: number;
  categoryName: string;
  categoryNameUr: string;
  categoryIcon: string;
}

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
  categoryName: string;
  categoryNameUr: string;
  categoryIcon: string;
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

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getFirstOfMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

// ─── Hook (Phase 4: wired to Convex) ─────────────────────────────────────────────

export function useBudgets(month?: number): UseBudgetsReturn {
  const resolvedMonth = month ?? getFirstOfMonth();
  // Explicit cast avoids IDE failure to resolve the deep FilterApi generic chain
  // in the generated api.d.ts (tsc resolves correctly, but IDE TS server may not).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedApi = api as any;
  const rawBudget = useQuery(typedApi.budgets.get, { month: resolvedMonth });

  // Only query budget categories when we have a budget
  const rawBudgetCategories = useQuery(
    typedApi.budgets.getBudgetCategories,
    rawBudget ? { budgetId: rawBudget._id } : "skip",
  );

  const budget: Budget | null = React.useMemo(() => {
    if (!rawBudget) return null;
    return {
      id: rawBudget._id,
      month: rawBudget.month,
      totalLimit: rawBudget.totalLimit,
    };
  }, [rawBudget]);

  const budgetCategories: BudgetCategory[] = React.useMemo(() => {
    if (!rawBudgetCategories) return [];
    return (rawBudgetCategories as RawBudgetCategoryDoc[]).map((bc) => ({
      id: bc._id,
      budgetId: bc.budgetId,
      categoryId: bc.categoryId,
      limit: bc.limit,
      spent: bc.spent,
      categoryName: bc.categoryName ?? "Unknown",
      categoryNameUr: bc.categoryNameUr ?? "نامعلوم",
      categoryIcon: bc.categoryIcon ?? "📦",
    }));
  }, [rawBudgetCategories]);

  const createBudgetMutation = useMutation(typedApi.budgets.create);
  const upsertCategoryMutation = useMutation(typedApi.budgets.upsertCategory);
  const deleteCategoryMutation = useMutation(typedApi.budgets.deleteCategory);

  const createBudget = React.useCallback(
    async (monthArg: number, totalLimit?: number) => {
      await createBudgetMutation({ month: monthArg, totalLimit });
    },
    [createBudgetMutation],
  );

  const upsertBudgetCategory = React.useCallback(
    async (categoryId: string, limit: number) => {
      if (!rawBudget) {
        throw new Error("No budget exists for this month. Create one first.");
      }
      await upsertCategoryMutation({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        budgetId: rawBudget._id as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        categoryId: categoryId as any,
        limit,
      });
    },
    [rawBudget, upsertCategoryMutation],
  );

  const deleteBudgetCategory = React.useCallback(
    async (categoryId: string) => {
      // Find the budget category by categoryId within the current budget's categories
      const bc = (
        rawBudgetCategories as RawBudgetCategoryDoc[] | undefined
      )?.find((b: RawBudgetCategoryDoc) => b.categoryId === categoryId);
      if (bc) {
        await deleteCategoryMutation({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          id: bc._id as any,
        });
      }
    },
    [rawBudgetCategories, deleteCategoryMutation],
  );

  // Loading: budget query hasn't resolved yet, or budget exists but
  // categories query is still pending.
  const loading =
    rawBudget === undefined ||
    (rawBudget !== null && rawBudgetCategories === undefined);

  return {
    budget,
    budgetCategories,
    loading,
    error: null,
    createBudget,
    upsertBudgetCategory,
    deleteBudgetCategory,
  };
}
