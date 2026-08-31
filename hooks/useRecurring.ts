"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// ─── Types ──────────────────────────────────────────────────────────────────────

export type Frequency = "daily" | "weekly" | "monthly" | "yearly";

export interface RecurringExpense {
  id: string;
  categoryId: string;
  description: string;
  amount: number;
  frequency: Frequency;
  nextDueDate: number;
  isActive: boolean;
  categoryName: string;
  categoryNameUr: string;
  categoryIcon: string;
}

export interface CreateRecurringInput {
  categoryId: string;
  description: string;
  amount: number;
  frequency: Frequency;
  nextDueDate: number;
}

export interface UpdateRecurringInput extends Partial<CreateRecurringInput> {
  id: string;
  isActive?: boolean;
}

export interface UseRecurringReturn {
  items: RecurringExpense[];
  loading: boolean;
  error: Error | null;
  create: (input: CreateRecurringInput) => Promise<void>;
  update: (input: UpdateRecurringInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  markPaid: (id: string, logExpense: boolean) => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useRecurring(): UseRecurringReturn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedApi = api as any;
  const rawItems = useQuery(typedApi.recurring.list) as
    | Array<{
        _id: string;
        categoryId: string;
        description: string;
        amount: number;
        frequency: Frequency;
        nextDueDate: number;
        isActive: boolean;
        categoryName: string;
        categoryNameUr: string;
        categoryIcon: string;
      }>
    | undefined;

  const createMutation = useMutation(typedApi.recurring.create);
  const updateMutation = useMutation(typedApi.recurring.update);
  const removeMutation = useMutation(typedApi.recurring.remove);
  const markPaidMutation = useMutation(typedApi.recurring.markPaid);

  const items: RecurringExpense[] = React.useMemo(() => {
    if (!rawItems) return [];
    return rawItems.map((r) => ({
      id: r._id,
      categoryId: r.categoryId,
      description: r.description,
      amount: r.amount,
      frequency: r.frequency,
      nextDueDate: r.nextDueDate,
      isActive: r.isActive,
      categoryName: r.categoryName,
      categoryNameUr: r.categoryNameUr,
      categoryIcon: r.categoryIcon,
    }));
  }, [rawItems]);

  const create = React.useCallback(
    async (input: CreateRecurringInput) => {
      await createMutation({
        categoryId: input.categoryId,
        description: input.description,
        amount: input.amount,
        frequency: input.frequency,
        nextDueDate: input.nextDueDate,
      });
    },
    [createMutation],
  );

  const update = React.useCallback(
    async (input: UpdateRecurringInput) => {
      await updateMutation({
        id: input.id,
        categoryId: input.categoryId,
        description: input.description,
        amount: input.amount,
        frequency: input.frequency,
        nextDueDate: input.nextDueDate,
        isActive: input.isActive,
      });
    },
    [updateMutation],
  );

  const remove = React.useCallback(
    async (id: string) => {
      await removeMutation({ id });
    },
    [removeMutation],
  );

  const markPaid = React.useCallback(
    async (id: string, logExpense: boolean) => {
      await markPaidMutation({ id, logExpense });
    },
    [markPaidMutation],
  );

  return {
    items,
    loading: rawItems === undefined,
    error: null,
    create,
    update,
    remove,
    markPaid,
  };
}
