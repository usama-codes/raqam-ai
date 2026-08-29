// lib/ai/orchestrator.ts — Multi-agent orchestration using OpenAI Agents SDK
// Uses a triage agent with specialist handoffs:
//   Triage → Education Agent | Analyze Agent | Action Agent
//
// The GeminiModelProvider bypasses the `openai` npm package to avoid
// Convex runtime restrictions (URL.username setter not implemented).

// Polyfill CustomEvent — the SDK's browser shim uses it for internal
// event dispatching, but the Convex action runtime lacks this DOM global.
if (typeof globalThis.CustomEvent === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).CustomEvent = class CustomEvent extends Event {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    detail: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(
      type: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params?: { detail?: any; bubbles?: boolean; cancelable?: boolean },
    ) {
      super(type, params);
      this.detail = params?.detail ?? null;
    }
  };
}

import { Agent, Runner } from "@openai/agents";
import type { AgentInputItem, RunContext } from "@openai/agents";
import { GeminiModelProvider } from "./gemini-provider";
import { buildBasePrompt } from "./prompts/base";
import { LITERACY_PROMPT } from "./prompts/literacy";
import { buildAnalysisPrompt } from "./prompts/analysis";
import { ACTION_PROMPT } from "./prompts/action";
import {
  buildFinancialContext,
  formatContextForPrompt,
} from "./context-builder";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface OrchestratorInput {
  userMessage: string;
  preferredLanguage: "ur" | "en";
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface OrchestratorResult {
  content: string;
  intentType: "educate" | "analyze" | "recommend" | "act";
  error?: string;
}

/**
 * Shared context passed to every agent via the SDK run context.
 * Agents access this through `runContext.context` in their dynamic instructions.
 */
interface AgentContext {
  preferredLanguage: "ur" | "en";
  financialContext: string | null;
}

// ─── Agent factory ──────────────────────────────────────────────────────────────

/**
 * Build the multi-agent system for a given run context.
 *
 * Architecture:
 *   triageAgent  →  educationAgent  (financial literacy questions)
 *                →  analyzeAgent     (data-grounded analysis & recommendations)
 *                →  actionAgent      (transaction extraction — Phase 9)
 */
function buildAgents(): Agent<AgentContext> {
  // ── Specialist agents ────────────────────────────────────────────────────

  const educationAgent = new Agent<AgentContext>({
    name: "Education Agent",
    handoffDescription:
      "Handles financial literacy questions — e.g., what is inflation, how compound interest works, committee savings.",
    instructions: (ctx: RunContext<AgentContext>) => {
      const base = buildBasePrompt(ctx.context.preferredLanguage);
      return `${base}\n\n${LITERACY_PROMPT}`;
    },
    model: "gemini-2.0-flash",
  });

  const analyzeAgent = new Agent<AgentContext>({
    name: "Analyze Agent",
    handoffDescription:
      "Handles questions about the user's own financial data and personalized advice — spending analysis, savings rate, budget recommendations.",
    instructions: (ctx: RunContext<AgentContext>) => {
      const base = buildBasePrompt(ctx.context.preferredLanguage);
      const { financialContext } = ctx.context;

      if (financialContext) {
        return `${base}\n\n${buildAnalysisPrompt(financialContext)}`;
      }

      return `${base}\n\nNote: Financial data is not available yet. Tell the user their data may not be loaded and suggest they add some transactions first.`;
    },
    model: "gemini-2.0-flash",
  });

  const actionAgent = new Agent<AgentContext>({
    name: "Action Agent",
    handoffDescription:
      "Handles requests to create, edit, or delete financial records — adding transactions, creating budgets.",
    instructions: (ctx: RunContext<AgentContext>) => {
      const base = buildBasePrompt(ctx.context.preferredLanguage);
      return `${base}\n\n${ACTION_PROMPT}`;
    },
    model: "gemini-2.0-flash",
  });

  // ── Triage agent — routes to the appropriate specialist ──────────────────

  const triageAgent = new Agent<AgentContext>({
    name: "Triage Agent",
    instructions: (ctx: RunContext<AgentContext>) => {
      const langNote =
        ctx.context.preferredLanguage === "ur"
          ? 'The user speaks Urdu. Classify Urdu and Roman Urdu messages carefully — "kitna kharch hua?" is an analyze intent, "inflation kya hai?" is educate, "500 ka petrol add karo" is act.'
          : "The user speaks English.";

      return `You are an intent router for a Pakistani financial assistant app called Raqam-AI.

Classify the user's message and route to the correct specialist agent:

- **Education Agent**: Financial literacy questions (e.g., "inflation kya hai?", "what is compound interest?", "committee kya hoti hai?")
- **Analyze Agent**: Questions about the user's OWN financial data OR requests for personalized advice (e.g., "is mahine kitna kharch hua?", "where do I spend most?", "how can I save more?", "budget suggestions")
- **Action Agent**: Requests to create, edit, or delete a financial record (e.g., "500 ka petrol add karo", "delete yesterday's transaction", "create a budget")

${langNote}

Route to the correct agent based on the user's intent.`;
    },
    handoffs: [educationAgent, analyzeAgent, actionAgent],
    model: "gemini-2.0-flash",
  });

  return triageAgent;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Convert our stored conversation history into the SDK's AgentInputItem format.
 */
function toAgentInput(
  history: Array<{ role: "user" | "assistant"; content: string }>,
): AgentInputItem[] {
  // The SDK's assistant role requires a `status` field, but our stored
  // messages don't carry one. Cast is safe at runtime — the SDK accepts
  // simple { role, content } objects for Chat Completions.
  return history.map((msg) => ({
    role: msg.role,
    content: msg.content,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any[];
}

/**
 * Map the final agent name back to our intent type enum.
 */
function agentNameToIntent(
  name: string,
): "educate" | "analyze" | "recommend" | "act" {
  if (name.includes("Education")) return "educate";
  if (name.includes("Analyze")) return "analyze";
  if (name.includes("Action")) return "act";
  return "educate";
}

// ─── Main orchestrator ──────────────────────────────────────────────────────────

/**
 * Main entry point for the AI pipeline.
 * Called from a Convex action with the action context and API reference.
 *
 * Flow:
 *   1. Configure Gemini via OpenAI-compatible endpoint
 *   2. Convert conversation history to SDK format
 *   3. Build financial context from Convex
 *   4. Create multi-agent system (triage → specialists)
 *   5. Run the agent pipeline
 *   6. Map the result back to our response format
 */
export async function orchestrate(
  input: OrchestratorInput,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actionCtx: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiRef: any,
): Promise<OrchestratorResult> {
  try {
    // 1. Configure Gemini via its OpenAI-compatible endpoint
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GOOGLE_GENERATIVE_AI_API_KEY not set. Set it in Convex deployment environment variables.",
      );
    }
    const geminiProvider = new GeminiModelProvider({
      apiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      defaultModel: "gemini-2.0-flash",
    });

    // 2. Convert conversation history to the SDK's input format
    const history = toAgentInput(input.conversationHistory.slice(-10));

    // 3. Build financial context (available to specialist agents via run context)
    let financialContextStr: string | null = null;
    try {
      const ctx = await buildFinancialContext(actionCtx, apiRef);
      financialContextStr = formatContextForPrompt(ctx);
    } catch {
      // Financial data may not exist yet — specialists handle this gracefully
    }

    // 4. Build the agent system
    const agentContext: AgentContext = {
      preferredLanguage: input.preferredLanguage,
      financialContext: financialContextStr,
    };
    const triageAgent = buildAgents();

    // 5. Run the multi-agent pipeline via a Runner with Gemini provider + tracing disabled
    const runner = new Runner({
      modelProvider: geminiProvider,
      tracingDisabled: true,
    });
    const result = await runner.run(
      triageAgent,
      [...history, { role: "user" as const, content: input.userMessage }],
      {
        context: agentContext,
        maxTurns: 5,
      },
    );

    // 6. Determine which specialist handled the response
    const intentType = result.lastAgent
      ? agentNameToIntent(result.lastAgent.name)
      : "educate";

    return {
      content: result.finalOutput ?? "",
      intentType,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("AI orchestration error:", message);

    // Return a user-friendly error message in the user's language
    const errorContent =
      input.preferredLanguage === "ur"
        ? "معذرت، معاون میں کوئی مسئلہ آ گیا۔ براہ کرم دوبارہ کوشش کریں۔"
        : "Sorry, the assistant encountered an issue. Please try again.";

    return {
      content: errorContent,
      intentType: "educate",
      error: message,
    };
  }
}
