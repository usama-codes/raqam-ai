"use client";

import * as React from "react";

// ─── Types ──────────────────────────────────────────────────────────────────────

export type TransactionType = "income" | "expense";
export type TransactionSource =
  | "manual"
  | "conversational"
  | "voice"
  | "receipt"
  | "import";

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

// ─── Hook (Phase 2: returns empty data; Convex wired in Phase 4) ─────────────────

export function useTransactions(): UseTransactionsReturn {
  const createTransaction = React.useCallback(
    async (_input: CreateTransactionInput): Promise<void> => {
      // No-op until Convex is connected in Phase 4
    },
    [],
  );

  const updateTransaction = React.useCallback(
    async (_input: UpdateTransactionInput): Promise<void> => {
      // No-op until Convex is connected in Phase 4
    },
    [],
  );

  const deleteTransaction = React.useCallback(
    async (_id: string): Promise<void> => {
      // No-op until Convex is connected in Phase 4
    },
    [],
  );

  return {
    transactions: [],
    loading: false,
    error: null,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
