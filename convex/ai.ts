"use node";

// convex/ai.ts — Node.js Convex action for the AI pipeline.
//
// Runs in the Convex Node runtime ("use node") so the real `openai` client and
// the `@openai/agents` SDK work without shims. Node actions cannot touch
// `ctx.db` directly — all reads/writes go through `ctx.runQuery` / `ctx.runMutation`
// against the queries and mutations in `convex/assistant.ts`.

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { orchestrate } from "@/lib/ai/orchestrator";
import {
  callGeminiWithFallback,
  TRANSCRIBE_MODELS,
  VISION_MODELS,
} from "@/lib/ai/models";

/**
 * The main AI pipeline action. Called from the client hook.
 *
 * Flow:
 * 1. Save user message to Convex
 * 2. Fetch conversation history for context
 * 3. Run AI orchestrator (classify intent → build context → generate response)
 * 4. Save assistant response to Convex
 * 5. If action proposed, create pendingAction for confirmation gate
 * 6. Return the response to the client
 */
export const sendMessage = action({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    inputMode: v.optional(
      v.union(v.literal("text"), v.literal("voice"), v.literal("receipt")),
    ),
  },
  handler: async (ctx, args) => {
    // 1. Save user message
    await ctx.runMutation(api.assistant.saveUserMessage, {
      conversationId: args.conversationId,
      content: args.content,
      inputMode: args.inputMode,
    });

    // 2. Fetch conversation history (last 10 messages)
    const history = await ctx.runQuery(api.assistant.getConversationHistory, {
      conversationId: args.conversationId,
    });

    // 3. Get user's preferred language
    const preferredLanguage = await ctx.runQuery(
      api.assistant.getPreferredLanguage,
      {},
    );

    // 4. Run AI orchestrator
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiRef = api as any;
    const result = await orchestrate(
      {
        userMessage: args.content,
        preferredLanguage: preferredLanguage as "ur" | "en",
        conversationHistory: history,
      },
      ctx,
      apiRef,
    );

    // 5. Save assistant response
    await ctx.runMutation(api.assistant.saveAssistantMessage, {
      conversationId: args.conversationId,
      content: result.content,
      intentType: result.intentType,
    });

    // 6. If action proposed, create pendingAction for the confirmation gate
    if (result.pendingAction && result.pendingAction.userFacingMessage) {
      await ctx.runMutation(apiRef.pendingActions.createPendingAction, {
        conversationId: args.conversationId,
        actionType: result.pendingAction.actionType,
        parameters: result.pendingAction.parameters,
        userFacingMessage: result.pendingAction.userFacingMessage,
      });
    }

    return result;
  },
});

/**
 * Audio transcription — uses Gemini to transcribe a recorded audio blob.
 * Tries purpose-built gemini-3.5-transcribe first, then falls back through
 * the general Flash model chain.
 */
export const transcribeAudio = action({
  args: {
    audioBase64: v.string(),
    mimeType: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return { transcript: "", error: "GOOGLE_GENERATIVE_AI_API_KEY not set." };
    }

    try {
      const result = await callGeminiWithFallback(apiKey, TRANSCRIBE_MODELS, {
        contents: [
          {
            parts: [
              {
                text: `Transcribe the following audio recording to text. The speech may be in Urdu or English. Return ONLY the transcribed text, nothing else. If the audio is unclear or silent, return an empty string.`,
              },
              {
                inline_data: {
                  mime_type: args.mimeType,
                  data: args.audioBase64,
                },
              },
            ],
          },
        ],
      });

      return {
        transcript: result.text.trim(),
        error: null,
      };
    } catch (err) {
      console.error("Audio transcription error:", err);
      return {
        transcript: "",
        error:
          err instanceof Error
            ? err.message
            : "Failed to transcribe audio recording",
      };
    }
  },
});

/**
 * Receipt OCR action — uses Gemini vision to extract fields from a receipt image.
 * Falls back through the VISION_MODELS chain if the primary model fails.
 */
export const processReceipt = action({
  args: {
    imageBase64: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return {
        error:
          "GOOGLE_GENERATIVE_AI_API_KEY not set in Convex environment variables.",
        extracted: null,
      };
    }

    try {
      const result = await callGeminiWithFallback(apiKey, VISION_MODELS, {
        contents: [
          {
            parts: [
              {
                text: `Extract data from this receipt image. Return ONLY a JSON object (no markdown, no code fences) with these exact fields:
{
  "merchant": "store/merchant name",
  "amount": "total amount as a number string (e.g. 1500)",
  "date": "date in YYYY-MM-DD format",
  "description": "brief description of items/purchase",
  "categorySuggestion": "suggested category: food, transport, shopping, utilities, entertainment, health, education, or other"
}
If a field cannot be determined, use an empty string. The amount should be the total/grand total. Do NOT include any text outside the JSON object.`,
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: args.imageBase64,
                },
              },
            ],
          },
        ],
      });

      // Try to parse the JSON from the response
      let extracted: {
        merchant: string;
        amount: string;
        date: string;
        description: string;
        categorySuggestion: string;
      };

      try {
        const cleaned = result.text
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        extracted = JSON.parse(cleaned);
      } catch {
        console.warn("Failed to parse receipt OCR JSON:", result.text);
        return {
          error: "Could not parse receipt data. Please try a clearer image.",
          extracted: null,
        };
      }

      return {
        extracted: {
          merchant: extracted.merchant ?? "",
          amount: extracted.amount ?? "",
          date: extracted.date ?? "",
          description: extracted.description ?? "",
          categorySuggestion: extracted.categorySuggestion ?? "",
        },
        error: null,
      };
    } catch (err) {
      console.error("Receipt OCR error:", err);
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to process receipt image",
        extracted: null,
      };
    }
  },
});
