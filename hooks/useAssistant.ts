"use client";

import * as React from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

// ─── Types ──────────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";
export type IntentType = "educate" | "analyze" | "recommend" | "act";
export type InputMode = "text" | "voice" | "receipt";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  inputMode?: InputMode;
  intentType?: IntentType;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Hook return type ────────────────────────────────────────────────────────────

export interface UseAssistantReturn {
  conversations: Conversation[];
  messages: ChatMessage[];
  currentConversationId: string | null;
  loading: boolean;
  sending: boolean;
  error: Error | null;
  sendMessage: (content: string, mode?: InputMode) => Promise<void>;
  startNewConversation: () => Promise<void>;
  switchConversation: (id: string) => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useAssistant(): UseAssistantReturn {
  // Reactive queries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawConversations = useQuery((api as any).conversations.list, {}) as
    | Array<{
        _id: string;
        title?: string;
        createdAt: number;
        updatedAt: number;
      }>
    | undefined;

  const [currentConversationId, setCurrentConversationId] = React.useState<
    string | null
  >(null);

  // Derive effective conversation ID: explicit selection, or first available
  const effectiveConversationId = React.useMemo(() => {
    if (currentConversationId) return currentConversationId;
    if (rawConversations && rawConversations.length > 0) {
      return rawConversations[0]._id;
    }
    return null;
  }, [currentConversationId, rawConversations]);

  // Query messages for the current conversation
  const rawMessages = useQuery(
    effectiveConversationId
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (api as any).conversations.getMessages
      : "skip",
    effectiveConversationId
      ? { conversationId: effectiveConversationId as never }
      : "skip",
  ) as
    | Array<{
        _id: string;
        role: MessageRole;
        content: string;
        inputMode?: InputMode;
        intentType?: IntentType;
        createdAt: number;
      }>
    | undefined;

  // Mutations and actions
  const createConversation = useMutation(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api as any).conversations.createConversation,
  );
  const sendMessageAction = useAction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api as any).ai.sendMessage,
  );

  // State
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  // Transform data
  const conversations: Conversation[] = React.useMemo(() => {
    if (!rawConversations) return [];
    return rawConversations.map((c) => ({
      id: c._id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }, [rawConversations]);

  const messages: ChatMessage[] = React.useMemo(() => {
    if (!rawMessages) return [];
    return rawMessages.map((m) => ({
      id: m._id,
      role: m.role,
      content: m.content,
      inputMode: m.inputMode,
      intentType: m.intentType,
      createdAt: m.createdAt,
    }));
  }, [rawMessages]);

  // Send message
  const sendMessage = React.useCallback(
    async (content: string, mode?: InputMode): Promise<void> => {
      if (!content.trim()) return;

      setSending(true);
      setError(null);

      try {
        let convId = effectiveConversationId;

        // Create conversation if needed
        if (!convId) {
          convId = (await createConversation({})) as string;
          setCurrentConversationId(convId);
        }

        // Call the AI action
        const result = await sendMessageAction({
          conversationId: convId as never,
          content,
          inputMode: mode ?? "text",
        });
        // Soft failures come back as a friendly in-chat message with the real
        // error attached — surface it to the console for debugging.
        if (result?.error) console.warn("[assistant]", result.error);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to send message"),
        );
      } finally {
        setSending(false);
      }
    },
    [effectiveConversationId, createConversation, sendMessageAction],
  );

  // Start new conversation
  const startNewConversation = React.useCallback(async (): Promise<void> => {
    const convId = (await createConversation({})) as string;
    setCurrentConversationId(convId);
  }, [createConversation]);

  // Switch conversation
  const switchConversation = React.useCallback((id: string): void => {
    setCurrentConversationId(id);
  }, []);

  return {
    conversations,
    messages,
    currentConversationId: effectiveConversationId,
    loading: rawConversations === undefined,
    sending,
    error,
    sendMessage,
    startNewConversation,
    switchConversation,
  };
}
