"use client";

// hooks/useSpeech.ts — speaking the assistant's Urdu replies aloud.
//
// Speech chain (mirrors the transcription chain in reverse):
//   1. Gemini TTS  — convex/ai.ts `synthesizeSpeech` returns a base64 WAV,
//                    played through a plain Audio element. High-quality,
//                    natural Urdu voice (default "Kore", GEMINI_TTS_VOICE env).
//   2. Browser     — window.speechSynthesis with an ur-PK voice. Kicks in when
//                    the server action fails or returns no audio.
//
// `speak` resolves only when playback finishes (or aborts), which is what the
// voice-call loop (hooks/useVoiceCall.ts) uses to know when to re-open the mic.

import * as React from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export type SpeechProvider = "gemini" | "browser";

export interface UseSpeechReturn {
  /** True while an utterance is playing (either engine). */
  speaking: boolean;
  /** Which engine produced the last utterance — null before the first one. */
  lastProvider: SpeechProvider | null;
  /** Speak the text; resolves when playback finishes. Returns the engine. */
  speak: (text: string) => Promise<SpeechProvider | null>;
  /** Immediately silence any ongoing playback. */
  stop: () => void;
}

export function useSpeech(lang = "ur-PK"): UseSpeechReturn {
  const [speaking, setSpeaking] = React.useState(false);
  const [lastProvider, setLastProvider] = React.useState<SpeechProvider | null>(
    null,
  );

  // Explicit cast avoids IDE failure to resolve the deep FilterApi generic
  // chain in the generated api.d.ts (tsc resolves correctly).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedApi = api as any;
  const synthesize = useAction(typedApi.ai.synthesizeSpeech);

  // The currently playing Audio element, so stop() can cut it short.
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const stop = React.useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const speakWithBrowser = React.useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          resolve();
          return;
        }
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        // Prefer an actual Urdu voice when the platform offers one; otherwise
        // the lang tag alone lets the browser pick the closest match.
        const urduVoice = synth
          .getVoices()
          .find((v) => v.lang?.toLowerCase().startsWith("ur"));
        if (urduVoice) utterance.voice = urduVoice;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        synth.cancel();
        synth.speak(utterance);
      }),
    [lang],
  );

  const speak = React.useCallback(
    async (text: string): Promise<SpeechProvider | null> => {
      stop();
      const clean = text.trim();
      if (!clean) return null;

      setSpeaking(true);
      try {
        // 1. Server-side Gemini TTS (base64 WAV in, Audio element out).
        try {
          const result = (await synthesize({ text: clean })) as {
            audioBase64: string | null;
            error: string | null;
          } | null;

          if (result?.audioBase64) {
            await new Promise<void>((resolve) => {
              const audio = new Audio(
                `data:audio/wav;base64,${result.audioBase64}`,
              );
              audioRef.current = audio;
              audio.onended = () => resolve();
              audio.onerror = () => resolve();
              audio.play().catch(() => resolve());
            });
            setLastProvider("gemini");
            return "gemini";
          }
          if (result?.error) {
            console.warn("[useSpeech] Gemini TTS unavailable:", result.error);
          }
        } catch (err) {
          console.warn("[useSpeech] Gemini TTS action failed:", err);
        }

        // 2. Browser speechSynthesis fallback.
        await speakWithBrowser(clean);
        setLastProvider("browser");
        return "browser";
      } finally {
        setSpeaking(false);
      }
    },
    [synthesize, speakWithBrowser, stop],
  );

  return { speaking, lastProvider, speak, stop };
}
