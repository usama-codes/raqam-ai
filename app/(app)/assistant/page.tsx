"use client";

import * as React from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { useAssistant } from "@/hooks/useAssistant";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import type { VoiceErrorCode } from "@/hooks/useVoiceInput";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import type { TranscriptProvider } from "@/lib/ai/transcription";
import { useLanguage } from "@/components/LanguageProvider";
import { ErrorState } from "@/components/shared/DataStates";
import { ConfirmationCard } from "@/components/assistant/ConfirmationCard";
import { ChatHistoryPanel } from "@/components/assistant/ChatHistoryPanel";
import { ChatComposer } from "@/components/assistant/ChatComposer";
import { ChatEmptyState } from "@/components/assistant/ChatEmptyState";
import { ChatMessage } from "@/components/assistant/ChatMessage";
import { ThinkingBubble } from "@/components/assistant/ThinkingBubble";
import { VoiceRecorder } from "@/components/assistant/VoiceRecorder";
import { ReceiptUploadDialog } from "@/components/receipt/ReceiptUploadDialog";
import type { ReceiptExtractedData } from "@/components/receipt/ReceiptUploadDialog";

export default function AssistantPage() {
  const assistant = useAssistant();
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
  } = assistant;
  const { t } = useLanguage();
  const voice = useVoiceInput();
  const call = useVoiceCall(assistant);

  const [input, setInput] = React.useState("");
  const [voiceProvider, setVoiceProvider] =
    React.useState<TranscriptProvider | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [receiptDialogOpen, setReceiptDialogOpen] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // ── Autoscroll to the newest message ──
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length, sending, pendingActions.length]);

  // ── Send ──
  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const mode = voiceProvider ? "voice" : "text";
    setInput("");
    setVoiceProvider(null);
    await sendMessage(text, mode);
  };

  const handleSuggestion = (text: string) => {
    if (sending) return;
    sendMessage(text, "text");
  };

  // ── Voice: toggle record; on stop, drop the transcript into the composer ──
  const handleMic = async () => {
    if (voice.isListening) {
      voice.stopListening();
      const result = await voice.waitForResult();
      if (result.transcript) {
        setInput(result.transcript);
        setVoiceProvider(result.provider);
      } else {
        setVoiceProvider(null);
      }
    } else {
      setInput("");
      setVoiceProvider(null);
      voice.startListening();
    }
  };

  const handleClearVoiceDraft = () => {
    setInput("");
    setVoiceProvider(null);
    voice.reset();
  };

  const handleSendReceipt = async (data: ReceiptExtractedData) => {
    const parts: string[] = [];
    if (data.merchant) parts.push(`Merchant: ${data.merchant}`);
    if (data.amount) parts.push(`Amount: Rs. ${data.amount}`);
    if (data.date) parts.push(`Date: ${data.date}`);
    if (data.description) parts.push(`Items: ${data.description}`);
    if (data.categorySuggestion)
      parts.push(`Category: ${data.categorySuggestion}`);

    const message = `I scanned a receipt. Here are the details:\n${parts.join("\n")}\n\nPlease add this as an expense transaction.`;
    await sendMessage(message, "receipt");
  };

  const voiceErrorText = (code: VoiceErrorCode | null): string | null => {
    switch (code) {
      case "mic-denied":
        return t("voice.micDenied");
      case "no-speech":
        return t("voice.noSpeech");
      case "not-supported":
        return t("voice.notSupported");
      case "timeout":
      case "transcribe-failed":
        return t("voice.transcribeFailed");
      default:
        return null;
    }
  };

  const voiceBusy = voice.isListening || voice.processing;
  const callActive = call.active;
  const errorText = voiceErrorText(voice.error);
  // A call ended by a mic problem keeps its explanation on screen after hang-up.
  const callErrorText =
    call.error === "mic-denied"
      ? t("voice.callMicDenied")
      : voiceErrorText(call.error);

  // Map the call's conversation phase onto the recorder's display modes.
  const callMode: "recording" | "processing" | "thinking" | "speaking" =
    call.status === "listening"
      ? "recording"
      : call.status === "transcribing"
        ? "processing"
        : call.status === "thinking"
          ? "thinking"
          : "speaking";

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-row lg:h-screen">
      {/* ── Chat history sidebar ── */}
      <aside
        className={`hidden shrink-0 flex-col overflow-hidden border-s border-border bg-card transition-[width] duration-200 ease-in-out md:flex ${
          sidebarOpen ? "w-[264px]" : "w-0 border-s-0"
        }`}
      >
        <div className="min-w-[264px]">
          <ChatHistoryPanel
            conversations={conversations}
            currentConversationId={currentConversationId}
            onNewChat={startNewConversation}
            onSwitch={switchConversation}
            onDelete={deleteConversation}
            disabled={sending || callActive}
          />
        </div>
      </aside>

      {/* ── Chat area ── */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-4 sm:px-8">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="hidden h-9 w-9 place-items-center rounded-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-primary md:grid"
            aria-label={t("assistant.chatHistory")}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-[18px] w-[18px]" />
            ) : (
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            )}
          </button>
          <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-primary pb-1 font-[var(--font-nastaliq)] text-[17px] text-[#E8B931]">
            ر
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[16px] font-bold">
              {t("assistant.title")}
            </span>
            <span className="truncate text-[12.5px] text-muted-foreground">
              {t("assistant.subtitle")}
            </span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-6 sm:px-8">
          {loading && (
            <div className="flex flex-1 items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          {error && <ErrorState />}

          {!loading && !error && messages.length === 0 && (
            <ChatEmptyState onSelect={handleSuggestion} />
          )}

          {!loading &&
            messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}

          {sending && <ThinkingBubble />}

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

          <div ref={messagesEndRef} />
        </div>

        {/* Voice error bar */}
        {errorText && !voiceBusy && !callActive && (
          <div
            className="flex items-center gap-2 border-t border-border bg-[#F6E6E4] px-6 py-2.5 text-[13px] text-[#8A2E26] sm:px-8"
            role="alert"
          >
            <span className="min-w-0 flex-1">{errorText}</span>
            <button
              onClick={() => voice.reset()}
              className="shrink-0 underline hover:no-underline"
            >
              {t("common.dismiss")}
            </button>
          </div>
        )}
        {callErrorText && !callActive && (
          <div
            className="flex items-center gap-2 border-t border-border bg-[#F6E6E4] px-6 py-2.5 text-[13px] text-[#8A2E26] sm:px-8"
            role="alert"
          >
            <span className="min-w-0 flex-1">{callErrorText}</span>
          </div>
        )}

        {/* Footer: call recorder OR voice recorder OR composer — never stacked */}
        {callActive ? (
          <VoiceRecorder
            mode={callMode}
            interimText={call.interimTranscript}
            onStop={call.finishTurn}
            call
            onEndCall={call.endCall}
            onSendTurn={call.finishTurn}
          />
        ) : voiceBusy ? (
          <VoiceRecorder
            mode={voice.isListening ? "recording" : "processing"}
            interimText={voice.interimTranscript}
            onStop={handleMic}
          />
        ) : (
          <ChatComposer
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onMic={handleMic}
            onCall={call.startCall}
            onReceipt={() => setReceiptDialogOpen(true)}
            onClearVoiceDraft={handleClearVoiceDraft}
            sending={sending}
            voiceSupported={voice.supported}
            voiceBusy={voiceBusy}
            voiceProvider={voiceProvider}
          />
        )}

        <ReceiptUploadDialog
          open={receiptDialogOpen}
          onOpenChange={setReceiptDialogOpen}
          onSendReceipt={handleSendReceipt}
          sending={sending}
        />
      </div>
    </div>
  );
}
