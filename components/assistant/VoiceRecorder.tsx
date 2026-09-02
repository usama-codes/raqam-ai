"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Mic, PhoneOff, Send, Square, Volume2 } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

const BAR_COUNT = 44;

// Deterministic pseudo-random bar heights (%), so SSR and CSR match.
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) =>
  Math.round(26 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 64),
);

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface VoiceRecorderProps {
  mode: "recording" | "processing" | "thinking" | "speaking";
  interimText: string;
  onStop: () => void;
  /** Voice-call mode: shows the hang-up (and send-turn) controls. */
  call?: boolean;
  /** Ends the whole call. Required in call mode. */
  onEndCall?: () => void;
  /** Sends the current turn to the assistant. Required while listening. */
  onSendTurn?: () => void;
}

/**
 * Replaces the composer while a recording is in progress or being transcribed.
 * Never rendered alongside the composer — no stacked input boxes. Mounts fresh
 * per recording, so the elapsed-time counter resets on its own.
 *
 * In call mode (`call`), it stays mounted for the entire conversation and
 * mirrors the turn loop: listening → transcribing → thinking → speaking.
 */
export function VoiceRecorder({
  mode,
  interimText,
  onStop,
  call = false,
  onEndCall,
  onSendTurn,
}: VoiceRecorderProps) {
  const { t } = useLanguage();
  const recording = mode === "recording";
  const speaking = mode === "speaking";

  const [seconds, setSeconds] = React.useState(0);
  React.useEffect(() => {
    if (mode !== "recording") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [mode]);

  const statusText = recording
    ? interimText || (call ? t("voice.callListening") : t("voice.recording"))
    : mode === "processing"
      ? call
        ? t("voice.callTranscribing")
        : t("voice.transcribing")
      : mode === "thinking"
        ? t("voice.callThinking")
        : t("voice.callSpeaking");

  return (
    <motion.div
      className="border-t border-border bg-card px-6 py-5 sm:px-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
        <div className="relative grid h-14 w-14 place-items-center">
          {(recording || speaking) && (
            <span className="absolute inset-0 animate-[rq-glow_1.6s_ease-in-out_infinite] rounded-full bg-primary/15" />
          )}
          <span
            className={cn(
              "relative grid h-12 w-12 place-items-center rounded-full text-primary-foreground",
              speaking ? "bg-[#0F5132]" : "bg-primary",
            )}
          >
            {recording ? (
              <Mic className="h-5 w-5" />
            ) : speaking ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            )}
          </span>
        </div>

        {recording && (
          <span className="font-[var(--font-manrope)] text-[13px] tabular-nums text-muted-foreground">
            {formatClock(seconds)}
          </span>
        )}

        <div className="flex h-8 items-center justify-center gap-[3px]">
          {BAR_HEIGHTS.map((h, i) => (
            <span
              key={i}
              className={cn(
                "w-[3px] origin-center rounded-full bg-primary/40",
                recording && "animate-[rq-pulse_1s_ease-in-out_infinite]",
              )}
              style={{
                height: recording ? `${h}%` : "18%",
                animationDelay: `${(i % 12) * 0.06}s`,
              }}
            />
          ))}
        </div>

        <p className="min-h-[1.25rem] max-w-md truncate text-center text-[13.5px] text-muted-foreground">
          {statusText}
        </p>

        {call ? (
          /* ── Call controls: hang up always, send turn while listening ── */
          <div className="mt-1 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onEndCall}
              aria-label={t("voice.callEnd")}
              title={t("voice.callEnd")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#B3261E] text-white transition-colors hover:bg-[#8A2E26]"
            >
              <PhoneOff className="h-[18px] w-[18px]" />
            </button>
            {recording && (
              <button
                type="button"
                onClick={onSendTurn ?? onStop}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-[#14231B]"
              >
                <Send className="h-3.5 w-3.5" />
                {t("voice.callTurnSend")}
              </button>
            )}
          </div>
        ) : (
          recording && (
            <button
              type="button"
              onClick={onStop}
              className="mt-1 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground transition-colors hover:bg-[#14231B]"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              {t("voice.stop")}
            </button>
          )
        )}
      </div>
    </motion.div>
  );
}
