import { describe, it, expect } from "vitest";
import {
  IntentClassification,
  TransactionExtraction,
  AIResponse,
} from "@/lib/ai/schemas";
import {
  CreateTransactionParams,
  DeleteTransactionParams,
  CreateSavingsGoalParams,
  ActionExtraction,
} from "@/lib/ai/action-schemas";

// AGENTS.md §13 (AI validation tests): "TransactionExtraction Zod schema: valid input
// passes, missing amount fails, negative amount fails. Tool schema validation: each
// tool's Zod schema rejects invalid input." Model output that fails validation must
// never reach the confirmation gate (AGENTS.md §7).

// ─── lib/ai/schemas.ts ─────────────────────────────────────────────────────────

describe("IntentClassification", () => {
  it("accepts a well-formed classification", () => {
    expect(
      IntentClassification.safeParse({
        intent: "analyze",
        confidence: "high",
        rationale: "asks about own spending",
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown intent", () => {
    expect(
      IntentClassification.safeParse({
        intent: "chit-chat",
        confidence: "high",
        rationale: "x",
      }).success,
    ).toBe(false);
  });

  it("requires a rationale", () => {
    expect(
      IntentClassification.safeParse({ intent: "educate", confidence: "low" })
        .success,
    ).toBe(false);
  });
});

describe("TransactionExtraction", () => {
  const valid = {
    amount: 850,
    type: "expense" as const,
    description: "Petrol",
    suggestedCategory: "transportation",
    date: "2026-08-31",
    confidence: "high" as const,
  };

  it("accepts a valid extraction", () => {
    expect(TransactionExtraction.safeParse(valid).success).toBe(true);
  });

  it("treats clarificationNeeded as optional", () => {
    expect(
      TransactionExtraction.safeParse({
        ...valid,
        clarificationNeeded: "which day?",
      }).success,
    ).toBe(true);
  });

  it("rejects a missing amount", () => {
    const rest: Record<string, unknown> = { ...valid };
    delete rest.amount;
    expect(TransactionExtraction.safeParse(rest).success).toBe(false);
  });

  it("rejects a non-positive amount", () => {
    expect(
      TransactionExtraction.safeParse({ ...valid, amount: -1 }).success,
    ).toBe(false);
    expect(TransactionExtraction.safeParse({ ...valid, amount: 0 }).success).toBe(
      false,
    );
  });
});

describe("AIResponse", () => {
  it("accepts a response with no action extraction", () => {
    expect(
      AIResponse.safeParse({
        content: "Inflation ka matlab...",
        intentType: "educate",
      }).success,
    ).toBe(true);
  });

  it("validates the nested actionExtraction when present", () => {
    expect(
      AIResponse.safeParse({
        content: "add karein?",
        intentType: "act",
        actionExtraction: { amount: -5 },
      }).success,
    ).toBe(false);
  });
});

// ─── lib/ai/action-schemas.ts ──────────────────────────────────────────────────

describe("CreateTransactionParams", () => {
  const valid = {
    type: "expense" as const,
    amount: 500,
    description: "petrol",
    categoryName: "transportation",
  };

  it("accepts valid params (date/notes optional)", () => {
    expect(CreateTransactionParams.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty description or category", () => {
    expect(
      CreateTransactionParams.safeParse({ ...valid, description: "" }).success,
    ).toBe(false);
    expect(
      CreateTransactionParams.safeParse({ ...valid, categoryName: "" }).success,
    ).toBe(false);
  });

  it("rejects a non-positive amount", () => {
    expect(
      CreateTransactionParams.safeParse({ ...valid, amount: 0 }).success,
    ).toBe(false);
  });
});

describe("DeleteTransactionParams", () => {
  it("requires a non-empty description", () => {
    expect(DeleteTransactionParams.safeParse({ description: "" }).success).toBe(
      false,
    );
    expect(
      DeleteTransactionParams.safeParse({ description: "grocery" }).success,
    ).toBe(true);
  });

  it("rejects a non-positive optional amount", () => {
    expect(
      DeleteTransactionParams.safeParse({ description: "x", amount: -10 })
        .success,
    ).toBe(false);
  });
});

describe("CreateSavingsGoalParams", () => {
  it("requires a name and a positive target", () => {
    expect(
      CreateSavingsGoalParams.safeParse({ name: "", targetAmount: 1000 })
        .success,
    ).toBe(false);
    expect(
      CreateSavingsGoalParams.safeParse({ name: "Bike", targetAmount: 0 })
        .success,
    ).toBe(false);
    expect(
      CreateSavingsGoalParams.safeParse({ name: "Bike", targetAmount: 50_000 })
        .success,
    ).toBe(true);
  });
});

describe("ActionExtraction discriminated union", () => {
  it("routes each action to its own param schema", () => {
    expect(
      ActionExtraction.safeParse({
        action: "createTransaction",
        params: {
          type: "expense",
          amount: 500,
          description: "petrol",
          categoryName: "transportation",
        },
      }).success,
    ).toBe(true);

    expect(
      ActionExtraction.safeParse({
        action: "createSavingsGoal",
        params: { name: "Hajj", targetAmount: 500_000 },
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown action", () => {
    expect(
      ActionExtraction.safeParse({
        action: "transferMoney",
        params: {},
      }).success,
    ).toBe(false);
  });

  it("rejects params that belong to a different action", () => {
    expect(
      ActionExtraction.safeParse({
        action: "createSavingsGoal",
        params: {
          type: "expense",
          amount: 500,
          description: "petrol",
          categoryName: "transportation",
        },
      }).success,
    ).toBe(false);
  });
});
