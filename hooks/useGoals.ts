"use client";

import * as React from "react";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface SavingsGoal {
  id: string;
  name: string;
  nameUr?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: number;
  isCompleted: boolean;
}

export interface CreateGoalInput {
  name: string;
  nameUr?: string;
  targetAmount: number;
  targetDate?: number;
}

export interface UpdateGoalInput {
  id: string;
  name?: string;
  nameUr?: string;
  targetAmount?: number;
  targetDate?: number;
}

// ─── Hook return type ────────────────────────────────────────────────────────────

export interface UseGoalsReturn {
  goals: SavingsGoal[];
  loading: boolean;
  error: Error | null;
  createGoal: (input: CreateGoalInput) => Promise<void>;
  updateGoal: (input: UpdateGoalInput) => Promise<void>;
  contributeToGoal: (id: string, amount: number) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

// ─── Hook (Phase 2: returns empty data; Convex wired in Phase 4) ─────────────────

export function useGoals(): UseGoalsReturn {
  const createGoal = React.useCallback(
    async (_input: CreateGoalInput): Promise<void> => {
      // No-op until Convex is connected in Phase 4
    },
    [],
  );

  const updateGoal = React.useCallback(
    async (_input: UpdateGoalInput): Promise<void> => {
      // No-op until Convex is connected in Phase 4
    },
    [],
  );

  const contributeToGoal = React.useCallback(
    async (_id: string, _amount: number): Promise<void> => {
      // No-op until Convex is connected in Phase 4
    },
    [],
  );

  const deleteGoal = React.useCallback(async (_id: string): Promise<void> => {
    // No-op until Convex is connected in Phase 4
  }, []);

  return {
    goals: [],
    loading: false,
    error: null,
    createGoal,
    updateGoal,
    contributeToGoal,
    deleteGoal,
  };
}
