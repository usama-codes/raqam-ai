"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Mic, Receipt, Send, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";
import { cn } from "@/lib/utils";
import type { TranscriptProvider } from "@/lib/ai/transcription";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onMic: () => void;
  onReceipt: () => void;
  onClearVoiceDraft: () => void;
  sending: boolean;
  voiceSupported: boolean;
  voiceBusy: boolean;
  /** Non-null when the current text is an unsent voice transcript. */
  voiceProvider: TranscriptProvider | null;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  onMic,
  onReceipt,
  onClearVoiceDraft,
  sending,
  voiceSupported,
  voiceBusy,
  voiceProvider,
}: ChatComposerProps) {
  const { t } = useLanguage();
  const [focused, setFocused] = React.useState(false);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 200,
  });

  React.useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const canSend = value.trim().length > 0 && !sending;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSend();
    }
  };

  const providerLabel =
    voiceProvider === "assemblyai"
      ? t("voice.byAssemblyai")
      : voiceProvider === "gemini"
        ? t("voice.byGemini")
        : voiceProvider === "browser"
          ? t("voice.byBrowser")
          : null;

  const iconButton =
    "grid h-10 w-10 place-items-center rounded-xl bg-accent text-primary transition-colors hover:bg-[#D5E5DA] disabled:opacity-40";

  return (
    <div className="border-t border-border bg-card px-4 pb-5 pt-4 sm:px-8">
      <motion.div
        className={cn(
          "mx-auto flex max-w-3xl flex-col gap-2 rounded-[18px] border bg-input px-3 pb-2.5 pt-3 transition-colors",
          focused ? "border-primary/40" : "border-input",
        )}
      >
        {voiceProvider && (
          <motion.div
            className="flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1 text-[12.5px] text-accent-foreground"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Mic className="h-3.5 w-3.5" />
            <span>{t("voice.reviewTitle")}</span>
            {providerLabel && (
              <span className="text-muted-foreground">· {providerLabel}</span>
            )}
            <button
              type="button"
              onClick={onClearVoiceDraft}
              className="grid h-4 w-4 place-items-center rounded-full hover:bg-black/10"
              aria-label={t("common.dismiss")}
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={1}
          dir="auto"
          placeholder={t("assistant.placeholder")}
          className="w-full resize-none bg-transparent px-1.5 text-[15.5px] leading-[1.9] placeholder:text-[#9BA79F] focus:outline-none"
          style={{ maxHeight: 200 }}
        />

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onMic}
            disabled={!voiceSupported || sending || voiceBusy}
            aria-label={t("assistant.voiceLabel")}
            title={
              voiceSupported
                ? t("assistant.voiceLabel")
                : t("voice.notSupported")
            }
            className={iconButton}
          >
            <Mic className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={onReceipt}
            disabled={sending}
            aria-label={t("assistant.receipt")}
            title={t("assistant.receipt")}
            className={iconButton}
          >
            <Receipt className="h-[18px] w-[18px]" />
          </button>

          <span className="flex-1" />

          <motion.button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            whileTap={{ scale: 0.97 }}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-[#14231B] disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>{t("assistant.send")}</span>
          </motion.button>
        </div>
      </motion.div>

      <p className="mx-auto mt-2 max-w-3xl px-2 text-[11.5px] leading-[1.7] text-[#8A9690]">
        {t("assistant.disclaimer")}
      </p>
    </div>
  );
}
