// lib/ai/schemas.ts — Zod schemas for AI structured outputs

import { z } from "zod";

// ─── Intent Classification ──────────────────────────────────────────────────────

/**
 * Schema for the intent classifier output.
 * Every user message is classified into exactly one intent.
 */
export const IntentClassification = z.object({
  intent: z.enum(["educate", "analyze", "recommend", "act"]),
  confidence: z.enum(["high", "medium", "low"]),
  /** Brief rationale for the classification (used for debugging) */
  rationale: z.string(),
});

export type IntentClassificationResult = z.infer<typeof IntentClassification>;

// ─── Transaction Extraction ─────────────────────────────────────────────────────

/**
 * Schema for extracting structured transaction data from natural language.
 * Used when intent = "act" and the user describes a transaction.
 */
export const TransactionExtraction = z.object({
  amount: z.number().positive(),
  type: z.enum(["income", "expense"]),
  description: z.string(),
  suggestedCategory: z.string(),
  date: z.string(), // ISO date string (YYYY-MM-DD)
  confidence: z.enum(["high", "medium", "low"]),
  clarificationNeeded: z.string().optional(),
});

export type TransactionExtractionResult = z.infer<typeof TransactionExtraction>;

// ─── AI Response ────────────────────────────────────────────────────────────────

/**
 * Schema for the structured AI response returned to the orchestrator.
 */
export const AIResponse = z.object({
  /** The text response to display to the user */
  content: z.string(),
  /** Classified intent that was determined */
  intentType: z.enum(["educate", "analyze", "recommend", "act"]),
  /** For "act" intent: structured extraction (Phase 9) */
  actionExtraction: TransactionExtraction.optional(),
});

export type AIResponseResult = z.infer<typeof AIResponse>;
