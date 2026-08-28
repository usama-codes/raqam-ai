"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// ─── Raw Convex document shape (needed because `api as any` erases inference) ──

interface RawTransactionDoc {
  _id: string;
  type: "income" | "expense";
  amount: number;
  categoryId: string;
  description?: string;
  descriptionUr?: string;
  date: number;
  notes?: string;
  source: "manual" | "conversational" | "voice" | "receipt" | "import";
  isRecurring: boolean;
  pendingConfirmation: boolean;
}

// ─── Types ──────────────────────────────────────────────────────────────────────

export type TransactionType = "income" | "expense";
export type TransactionSource =
  "manual" | "conversational" | "voice" | "receipt" | "import";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  description?: string;
  descriptionUr?: string;
  date: number; // Unix ms
  notes?: string;
  source: TransactionSource;
  isRecurring: boolean;
  pendingConfirmation: boolean;
}

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: number;
  description?: string;
  descriptionUr?: string;
  notes?: string;
  source: TransactionSource;
}

export interface UpdateTransactionInput extends CreateTransactionInput {
  id: string;
}

// ─── Hook return type ────────────────────────────────────────────────────────────

export interface UseTransactionsReturn {
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;
  createTransaction: (input: CreateTransactionInput) => Promise<void>;
  updateTransaction: (input: UpdateTransactionInput) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getFirstOfMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

function getFirstOfNextMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
}

// ─── Hook (Phase 4: wired to Convex) ─────────────────────────────────────────────

export function useTransactions(): UseTransactionsReturn {
  const monthStart = getFirstOfMonth();
  const monthEnd = getFirstOfNextMonth();
  // Explicit cast avoids IDE failure to resolve the deep FilterApi generic chain
  // in the generated api.d.ts (tsc resolves correctly, but IDE TS server may not).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedApi = api as any;
  const rawTransactions = useQuery(typedApi.transactions.list, {
    dateFrom: monthStart,
    dateTo: monthEnd,
  });
  const create = useMutation(typedApi.transactions.create);
  const update = useMutation(typedApi.transactions.update);
  const remove = useMutation(typedApi.transactions.remove);

  const transactions: Transaction[] = React.useMemo(() => {
    if (!rawTransactions) return [];
    return (rawTransactions as RawTransactionDoc[]).map((t) => ({
      id: t._id,
      type: t.type,
      amount: t.amount,
      categoryId: t.categoryId,
      description: t.description,
      descriptionUr: t.descriptionUr,
      date: t.date,
      notes: t.notes,
      source: t.source,
      isRecurring: t.isRecurring,
      pendingConfirmation: t.pendingConfirmation,
    }));
  }, [rawTransactions]);

  const createTransaction = React.useCallback(
    async (input: CreateTransactionInput) => {
      await create({
        type: input.type,
        amount: input.amount,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        categoryId: input.categoryId as any,
        date: input.date,
        description: input.description,
        descriptionUr: input.descriptionUr,
        notes: input.notes,
        source: input.source,
      });
    },
    [create],
  );

  const updateTransaction = React.useCallback(
    async (input: UpdateTransactionInput) => {
      await update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: input.id as any,
        type: input.type,
        amount: input.amount,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        categoryId: input.categoryId as any,
        date: input.date,
        description: input.description,
        descriptionUr: input.descriptionUr,
        notes: input.notes,
      });
    },
    [update],
  );

  const deleteTransaction = React.useCallback(
    async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await remove({ id: id as any });
    },
    [remove],
  );

  return {
    transactions,
    loading: rawTransactions === undefined,
    error: null,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
