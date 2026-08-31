"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface BudgetAlert {
  alertKey: string;
  periodKey: string;
  categoryId: string;
  categoryNameUr: string;
  categoryName: string;
  categoryIcon: string;
  spent: number;
  limit: number;
  pct: number;
  severity: "warning" | "over";
}

export interface UnusualAlert {
  alertKey: string;
  periodKey: string;
  categoryId: string;
  categoryNameUr: string;
  categoryName: string;
  categoryIcon: string;
  average: number;
  currentSpend: number;
  deviationPercent: number;
}

export interface BillReminder {
  alertKey: string;
  periodKey: string;
  recurringId: string;
  description: string;
  amount: number;
  categoryId: string;
  categoryNameUr: string;
  categoryIcon: string;
  nextDueDate: number;
  daysUntilDue: number;
  overdue: boolean;
}

export interface UseProactiveAlertsReturn {
  budgetAlerts: BudgetAlert[];
  unusualAlerts: UnusualAlert[];
  billReminders: BillReminder[];
  loading: boolean;
  hasAny: boolean;
  dismiss: (alertKey: string, periodKey: string) => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useProactiveAlerts(): UseProactiveAlertsReturn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedApi = api as any;
  const raw = useQuery(typedApi.proactive.getAlerts) as
    | {
        budgetAlerts: BudgetAlert[];
        unusualAlerts: UnusualAlert[];
        billReminders: BillReminder[];
      }
    | undefined;

  const dismissMutation = useMutation(typedApi.proactive.dismissAlert);

  const dismiss = React.useCallback(
    async (alertKey: string, periodKey: string) => {
      await dismissMutation({ alertKey, periodKey });
    },
    [dismissMutation],
  );

  const budgetAlerts = raw?.budgetAlerts ?? [];
  const unusualAlerts = raw?.unusualAlerts ?? [];
  const billReminders = raw?.billReminders ?? [];

  return {
    budgetAlerts,
    unusualAlerts,
    billReminders,
    loading: raw === undefined,
    hasAny:
      budgetAlerts.length > 0 ||
      unusualAlerts.length > 0 ||
      billReminders.length > 0,
    dismiss,
  };
}
