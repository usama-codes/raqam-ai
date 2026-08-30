// lib/ai/action-schemas.ts — Zod schemas for AI action extraction (Phase 9)
//
// The Action Agent returns a JSON block describing the proposed mutation.
// These schemas validate the extracted data before creating a pendingAction.

import { z } from "zod";

// ─── Individual action parameter schemas ──────────────────────────────────────

export const CreateTransactionParams = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive(),
  description: z.string().min(1),
  categoryName: z.string().min(1),
  /** ISO date string (YYYY-MM-DD) — defaults to today if omitted */
  date: z.string().optional(),
  notes: z.string().optional(),
});

export const DeleteTransactionParams = z.object({
  /** Description or keyword to find the most recent matching transaction */
  description: z.string().min(1),
  amount: z.number().positive().optional(),
});

export const CreateSavingsGoalParams = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  /** Optional ISO date string for the target date */
  targetDate: z.string().optional(),
});

// ─── Unified action extraction schema ─────────────────────────────────────────

/**
 * Schema for the complete action extraction from the Action Agent response.
 * The AI must return a JSON block matching this shape when proposing a mutation.
 */
export const ActionExtraction = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("createTransaction"),
    params: CreateTransactionParams,
  }),
  z.object({
    action: z.literal("deleteTransaction"),
    params: DeleteTransactionParams,
  }),
  z.object({
    action: z.literal("createSavingsGoal"),
    params: CreateSavingsGoalParams,
  }),
]);

export type ActionExtractionResult = z.infer<typeof ActionExtraction>;
export type CreateTransactionParamsResult = z.infer<
  typeof CreateTransactionParams
>;
export type DeleteTransactionParamsResult = z.infer<
  typeof DeleteTransactionParams
>;
export type CreateSavingsGoalParamsResult = z.infer<
  typeof CreateSavingsGoalParams
>;

// ─── Action type enum ─────────────────────────────────────────────────────────

export type ActionType =
  "createTransaction" | "deleteTransaction" | "createSavingsGoal";

/**
 * Human-readable labels for each action type (used in ConfirmationCard).
 */
export const ACTION_TYPE_LABELS: Record<
  ActionType,
  { ur: string; en: string }
> = {
  createTransaction: { ur: "لین دین شامل کریں", en: "Add Transaction" },
  deleteTransaction: { ur: "لین دین حذف کریں", en: "Delete Transaction" },
  createSavingsGoal: { ur: "بچت کا ہدف بنائیں", en: "Create Savings Goal" },
};
