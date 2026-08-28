"use client";

import * as React from "react";

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

// ─── Hook (Phase 2: returns empty data; AI wired in Phase 8) ─────────────────────

export function useAssistant(): UseAssistantReturn {
  const sendMessage = React.useCallback(
    async (_content: string, _mode?: InputMode): Promise<void> => {
      // No-op until AI is connected in Phase 8
    },
    [],
  );

  const startNewConversation = React.useCallback(async (): Promise<void> => {
    // No-op until AI is connected in Phase 8
  }, []);

  const switchConversation = React.useCallback((_id: string): void => {
    // No-op until Convex is connected in Phase 4
  }, []);

  return {
    conversations: [],
    messages: [],
    currentConversationId: null,
    loading: false,
    sending: false,
    error: null,
    sendMessage,
    startNewConversation,
    switchConversation,
  };
}
