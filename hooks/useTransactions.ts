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

/** Optional filters accepted by `useTransactions`. */
export interface TransactionFilters {
  /** Only include transactions on/after this date (Unix ms) */
  dateFrom?: number;
  /** Only include transactions before this date (Unix ms) */
  dateTo?: number;
  /** Filter by transaction type */
  type?: TransactionType;
  /** Filter by one or more category IDs */
  categoryIds?: string[];
  /** Full-text search on description / descriptionUr */
  search?: string;
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

// ─── Hook (Phase 5: optional filters, all transactions by default) ───────────────

export function useTransactions(
  filters?: TransactionFilters,
): UseTransactionsReturn {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedApi = api as any;

  const filterDateFrom = filters?.dateFrom;
  const filterDateTo = filters?.dateTo;

  // Pass date range to Convex only when explicitly provided; otherwise fetch all.
  const queryParams = React.useMemo(() => {
    const params: Record<string, unknown> = {};
    if (filterDateFrom !== undefined) params.dateFrom = filterDateFrom;
    if (filterDateTo !== undefined) params.dateTo = filterDateTo;
    return params;
  }, [filterDateFrom, filterDateTo]);

  const rawTransactions = useQuery(typedApi.transactions.list, queryParams);
  const create = useMutation(typedApi.transactions.create);
  const update = useMutation(typedApi.transactions.update);
  const remove = useMutation(typedApi.transactions.remove);

  const filterType = filters?.type;
  const filterCategoryIds = filters?.categoryIds;
  const filterSearch = filters?.search;

  const transactions: Transaction[] = React.useMemo(() => {
    if (!rawTransactions) return [];

    let mapped = (rawTransactions as RawTransactionDoc[]).map((t) => ({
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

    // Client-side filters ───────────────────────────────────────────────────────
    if (filterType) {
      mapped = mapped.filter((t) => t.type === filterType);
    }

    if (filterCategoryIds && filterCategoryIds.length > 0) {
      const idSet = new Set(filterCategoryIds);
      mapped = mapped.filter((t) => idSet.has(t.categoryId));
    }

    if (filterSearch && filterSearch.trim()) {
      const needle = filterSearch.trim().toLowerCase();
      mapped = mapped.filter((t) => {
        const desc = (t.description ?? "").toLowerCase();
        const descUr = (t.descriptionUr ?? "").toLowerCase();
        return desc.includes(needle) || descUr.includes(needle);
      });
    }

    return mapped;
  }, [rawTransactions, filterType, filterCategoryIds, filterSearch]);

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
