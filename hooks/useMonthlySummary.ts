"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface MonthlySummary {
  month: number;
  income: number;
  expenses: number;
  net: number;
  savingsRate: number;
  topCategories: Array<{
    categoryId: string;
    name: string;
    nameUr: string;
    icon: string;
    amount: number;
  }>;
  expenseDeltaPct: number | null;
}

export interface UseMonthlySummaryReturn {
  show: boolean;
  summary: MonthlySummary | null;
  loading: boolean;
  dismiss: () => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useMonthlySummary(): UseMonthlySummaryReturn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedApi = api as any;
  const raw = useQuery(typedApi.proactive.getMonthlySummary) as
    | { show: boolean; summary: MonthlySummary | null }
    | undefined;

  const dismissMutation = useMutation(typedApi.proactive.dismissMonthlySummary);

  const dismiss = React.useCallback(async () => {
    await dismissMutation({});
  }, [dismissMutation]);

  return {
    show: raw?.show ?? false,
    summary: raw?.summary ?? null,
    loading: raw === undefined,
    dismiss,
  };
}
