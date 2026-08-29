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

/**
 * The main AI pipeline action. Called from the client hook.
 *
 * Flow:
 * 1. Save user message to Convex
 * 2. Fetch conversation history for context
 * 3. Run AI orchestrator (classify intent → build context → generate response)
 * 4. Save assistant response to Convex
 * 5. Return the response to the client
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

    return result;
  },
});
