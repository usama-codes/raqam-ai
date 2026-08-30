"use client";

import * as React from "react";
import { useAssistant } from "@/hooks/useAssistant";
import type { InputMode } from "@/hooks/useAssistant";
import { useLanguage } from "@/components/LanguageProvider";
import { ErrorState } from "@/components/shared/DataStates";
import { MarkdownMessage } from "@/components/assistant/MarkdownMessage";
import { ConfirmationCard } from "@/components/assistant/ConfirmationCard";
import { ChatHistoryPanel } from "@/components/assistant/ChatHistoryPanel";
import { isLatinScript } from "@/lib/utils";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function AssistantPage() {
  const {
    conversations,
    messages,
    pendingActions,
    currentConversationId,
    loading,
    sending,
    error,
    sendMessage,
    startNewConversation,
    switchConversation,
    deleteConversation,
    confirmAction,
    rejectAction,
  } = useAssistant();
  const { t } = useLanguage();

  const [input, setInput] = React.useState("");
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    await sendMessage(trimmed, "text");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (text: string) => {
    sendMessage(text, "text");
  };

  const handleVoice = () => {
    sendMessage("", "voice" as InputMode);
  };

  const handleReceipt = () => {
    sendMessage("", "receipt" as InputMode);
  };

  const emptySuggestions = [
    t("assistant.suggestion1"),
    t("assistant.suggestion2"),
    t("assistant.suggestion3"),
    t("assistant.suggestion4"),
  ];

  const inputSuggestions = [
    t("assistant.suggestion2"),
    t("assistant.suggestion3"),
    t("assistant.suggestion4"),
    t("assistant.suggestion5"),
  ];

  return (
    <div className="flex min-h-[calc(100vh)] flex-row">
      {/* ── Chat history sidebar ── */}
      <aside
        className={`hidden shrink-0 flex-col overflow-hidden border-s border-[#E7E2D6] bg-white transition-[width] duration-200 ease-in-out md:flex ${
          sidebarOpen ? "w-[260px]" : "w-0 border-s-0"
        }`}
      >
        <div className="min-w-[260px]">
          <ChatHistoryPanel
            conversations={conversations}
            currentConversationId={currentConversationId}
            onNewChat={startNewConversation}
            onSwitch={switchConversation}
            onDelete={deleteConversation}
            disabled={sending}
          />
        </div>
      </aside>

      {/* ── Chat area ── */}
      <div className="flex min-w-0 flex-1 flex-col bg-[#F7F4EC]">
        {/* Chat header */}
        <header className="flex items-center justify-between border-b border-[#E7E2D6] bg-white px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="hidden h-9 w-9 place-items-center rounded-[10px] text-[#6B7A70] transition-colors hover:bg-[#F1EEE4] hover:text-[#0F5132] md:grid"
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-[18px] w-[18px]" />
              ) : (
                <PanelLeftOpen className="h-[18px] w-[18px]" />
              )}
            </button>
            <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-[#0F5132] pb-1 font-[var(--font-noto-nastaliq-urdu)] text-[17px] text-[#E8B931]">
              ر
            </span>
            <div className="flex flex-col">
              <span className="text-[17px] font-bold">
                {t("assistant.title")}
              </span>
              <span className="text-[13px] text-[#6B7A70]">
                {t("assistant.subtitle")}
              </span>
            </div>
          </div>
          <div className="hidden flex-wrap gap-2 text-[13px] sm:flex">
            <span className="rounded-full bg-[#E6EFE9] px-3 py-1.5 text-[#0F5132]">
              {t("assistant.badgeEducate")}
            </span>
            <span className="rounded-full bg-[#E6EFE9] px-3 py-1.5 text-[#0F5132]">
              {t("assistant.badgeAnalyze")}
            </span>
            <span className="rounded-full bg-[#E6EFE9] px-3 py-1.5 text-[#0F5132]">
              {t("assistant.badgeRecommend")}
            </span>
            <span className="rounded-full bg-[#FDF3D8] px-3 py-1.5 text-[#6B5B2E]">
              {t("assistant.badgeAct")}
            </span>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-[26px] sm:px-8">
          {/* ── Loading ── */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0F5132] border-t-transparent" />
            </div>
          )}

          {/* ── Error ── */}
          {error && <ErrorState />}

          {/* ── Empty state — no messages yet ── */}
          {!loading && !error && messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12">
              <div className="grid h-16 w-16 place-items-center rounded-[20px] bg-[#0F5132] font-[var(--font-noto-nastaliq-urdu)] text-[28px] text-[#E8B931]">
                ر
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <h2 className="text-[22px] font-bold font-[var(--font-nastaliq)] leading-[1.9]">
                  {t("assistant.greeting")}
                </h2>
                <p className="max-w-md text-[15px] font-reading text-[#6B7A70]">
                  {t("assistant.greetingDesc")}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {emptySuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="rounded-full bg-[#F1EEE4] px-3.5 py-2 text-[14px] hover:bg-[#E7E2D6]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Messages ── */}
          {!loading &&
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex max-w-[78%] flex-col gap-1.5 ${msg.role === "user" ? "self-start" : "self-end"}`}
              >
                {msg.role === "user" ? (
                  <div
                    className="flex max-w-[66%] flex-col gap-1.5 self-start"
                    dir={isLatinScript(msg.content) ? "ltr" : "rtl"}
                  >
                    <div
                      className={`flex items-center gap-2.5 rounded-[16px_16px_16px_4px] px-[18px] py-3.5 text-[16px] ${
                        isLatinScript(msg.content)
                          ? "bg-[#0F5132] leading-[1.7] text-[#EAF1EB]"
                          : "bg-[#0F5132] leading-[2] text-[#EAF1EB]"
                      }`}
                    >
                      {msg.inputMode === "voice" && (
                        <span className="rounded-full bg-white/15 px-2.5 py-1 text-[13px]">
                          {t("assistant.voiceLabel")}
                        </span>
                      )}
                      <span>{msg.content}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex max-w-[78%] flex-col gap-2 self-end">
                    {msg.intentType && (
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className="rounded-full px-2.5 py-1 font-[var(--font-manrope)] text-[10px] tracking-[.14em]"
                          style={{
                            background:
                              msg.intentType === "educate"
                                ? "#EDF1FA"
                                : msg.intentType === "analyze"
                                  ? "#E6EFE9"
                                  : "#FDF3D8",
                            color:
                              msg.intentType === "educate"
                                ? "#31518F"
                                : msg.intentType === "analyze"
                                  ? "#0F5132"
                                  : "#6B5B2E",
                          }}
                        >
                          {msg.intentType === "educate"
                            ? t("assistant.intentEducate")
                            : msg.intentType === "analyze"
                              ? t("assistant.intentAnalyze")
                              : msg.intentType === "recommend"
                                ? t("assistant.intentRecommend")
                                : t("assistant.intentAct")}
                        </span>
                      </div>
                    )}
                    <div
                      className={`rounded-[16px_16px_4px_16px] border border-[#E7E2D6] bg-white px-5 py-4 text-[16px] ${
                        isLatinScript(msg.content)
                          ? "leading-[1.7]"
                          : "font-reading"
                      }`}
                      dir={isLatinScript(msg.content) ? "ltr" : "rtl"}
                    >
                      <MarkdownMessage content={msg.content} />
                    </div>
                  </div>
                )}
              </div>
            ))}

          {/* Sending indicator */}
          {sending && (
            <div className="flex max-w-[78%] self-end">
              <div className="rounded-[16px_16px_4px_16px] border border-[#E7E2D6] bg-white px-5 py-4">
                <div className="flex gap-1.5">
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-[#8A9690]"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-[#8A9690]"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-[#8A9690]"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Pending action confirmation cards */}
          {!loading &&
            pendingActions.map((action) => (
              <ConfirmationCard
                key={action.id}
                action={action}
                onConfirm={confirmAction}
                onReject={rejectAction}
                disabled={sending}
              />
            ))}
        </div>

        {/* Input area */}
        <div className="flex flex-col gap-3 border-t border-[#E7E2D6] bg-white px-6 pb-6 pt-4 sm:px-8">
          <div className="flex flex-wrap gap-2">
            {inputSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="cursor-pointer rounded-full bg-[#F1EEE4] px-3.5 py-2 text-[14px] hover:bg-[#E7E2D6]"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2.5 rounded-[14px] border border-[#DCD6C8] bg-[#FBF9F4] px-4 py-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("assistant.placeholder")}
              className="flex-1 bg-transparent text-[16px] placeholder:text-[#9BA79F] focus:outline-none"
            />
            <button
              onClick={handleVoice}
              className="rounded-[10px] border-0 bg-[#E6EFE9] px-3.5 py-2.5 text-[13px] text-[#0F5132]"
            >
              {t("assistant.voice")}
            </button>
            <button
              onClick={handleReceipt}
              className="rounded-[10px] border-0 bg-[#E6EFE9] px-3.5 py-2.5 text-[13px] text-[#0F5132]"
            >
              {t("assistant.receipt")}
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="rounded-[10px] border-0 bg-[#0F5132] px-[18px] py-2.5 text-[14px] text-white hover:bg-[#14231B] disabled:opacity-50"
            >
              {t("assistant.send")}
            </button>
          </div>
          <span className="text-[12px] leading-[1.8] text-[#8A9690]">
            {t("assistant.disclaimer")}
          </span>
        </div>
      </div>
    </div>
  );
}
