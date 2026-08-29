// convex/assistant.ts — Convex action for the AI pipeline
// Actions run server-side and can access environment variables (API keys).

import {
  action,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { requireUser } from "./auth";
import { orchestrate } from "@/lib/ai/orchestrator";

// ─── Queries ────────────────────────────────────────────────────────────────────

/**
 * Get the user's preferred language for the AI prompt.
 */
export const getPreferredLanguage = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const user = await requireUser(ctx);
    return user.preferredLanguage ?? "ur";
  },
});

/**
 * Get conversation history for the AI context window (last 10 messages).
 */
export const getConversationHistory = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx: QueryCtx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .take(10);

    return messages.reverse().map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  },
});

// ─── Internal mutations (called from the action) ────────────────────────────────

/**
 * Save user message to conversation.
 */
export const saveUserMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    inputMode: v.optional(
      v.union(v.literal("text"), v.literal("voice"), v.literal("receipt")),
    ),
  },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: user._id,
      role: "user",
      content: args.content,
      inputMode: args.inputMode ?? "text",
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });
    return messageId;
  },
});

/**
 * Save assistant response to conversation.
 */
export const saveAssistantMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    intentType: v.optional(
      v.union(
        v.literal("educate"),
        v.literal("analyze"),
        v.literal("recommend"),
        v.literal("act"),
      ),
    ),
  },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: user._id,
      role: "assistant",
      content: args.content,
      intentType: args.intentType,
      createdAt: Date.now(),
    });

    // Update conversation timestamp + auto-title
    const conv = await ctx.db.get(args.conversationId);
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (conv && !conv.title) {
      const firstUserMsg = await ctx.db
        .query("messages")
        .withIndex("by_conversationId", (q) =>
          q.eq("conversationId", args.conversationId),
        )
        .order("asc")
        .first();
      if (firstUserMsg?.role === "user") {
        updates.title = firstUserMsg.content.slice(0, 50);
      }
    }
    await ctx.db.patch(args.conversationId, updates);
    return messageId;
  },
});

// ─── Main AI action ─────────────────────────────────────────────────────────────

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
