"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

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

// ─── Hook (Phase 4: wired to Convex) ─────────────────────────────────────────────

export function useGoals(): UseGoalsReturn {
  const rawGoals = useQuery(api.goals.list);
  const create = useMutation(api.goals.create);
  const update = useMutation(api.goals.update);
  const contribute = useMutation(api.goals.contribute);
  const remove = useMutation(api.goals.remove);

  const goals: SavingsGoal[] = React.useMemo(() => {
    if (!rawGoals) return [];
    return rawGoals.map((g) => ({
      id: g._id,
      name: g.name,
      nameUr: g.nameUr,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      targetDate: g.targetDate,
      isCompleted: g.isCompleted,
    }));
  }, [rawGoals]);

  const createGoal = React.useCallback(
    async (input: CreateGoalInput) => {
      await create({
        name: input.name,
        nameUr: input.nameUr,
        targetAmount: input.targetAmount,
        targetDate: input.targetDate,
      });
    },
    [create],
  );

  const updateGoal = React.useCallback(
    async (input: UpdateGoalInput) => {
      await update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: input.id as any,
        name: input.name,
        nameUr: input.nameUr,
        targetAmount: input.targetAmount,
        targetDate: input.targetDate,
      });
    },
    [update],
  );

  const contributeToGoal = React.useCallback(
    async (id: string, amount: number) => {
      await contribute({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        id: id as any,
        amount,
      });
    },
    [contribute],
  );

  const deleteGoal = React.useCallback(
    async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await remove({ id: id as any });
    },
    [remove],
  );

  return {
    goals,
    loading: rawGoals === undefined,
    error: null,
    createGoal,
    updateGoal,
    contributeToGoal,
    deleteGoal,
  };
}
