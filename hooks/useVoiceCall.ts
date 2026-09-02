"use client";

// hooks/useVoiceCall.ts — the hands-free Urdu voice conversation loop.
//
// One "turn" of the call:
//   1. listening    — the mic is open; the user speaks (interim text streams in)
//   2. transcribing — the recording goes through the AssemblyAI → Gemini →
//                    browser transcription chain (useVoiceInput)
//   3. thinking     — the transcript is sent to the assistant (useAssistant)
//   4. speaking     — the reply is spoken aloud via Gemini TTS with a browser
//                    speechSynthesis fallback (useSpeech)
//   …then the mic re-opens and the loop continues until the user ends the call.
//
// The loop shares the page's useAssistant instance (passed in as `assistant`)
// so spoken turns continue the SAME conversation the chat shows — including the
// pendingAction confirmation cards (P5: the AI never mutates without the user
// seeing and confirming it).

import * as React from "react";
import type { UseAssistantReturn } from "@/hooks/useAssistant";
import { useSpeech, type SpeechProvider } from "@/hooks/useSpeech";
import {
  useVoiceInput,
  type VoiceErrorCode,
  type VoiceOutcome,
} from "@/hooks/useVoiceInput";

export type VoiceCallStatus =
  | "idle" // not in a call
  | "listening" // mic open, user speaking
  | "transcribing" // recording → text
  | "thinking" // text → assistant
  | "speaking"; // assistant reply → audio

export interface UseVoiceCallReturn {
  /** True while the call is in any active phase. */
  active: boolean;
  status: VoiceCallStatus;
  /** Live interim transcript while the user speaks. */
  interimTranscript: string;
  /** Which TTS engine spoke the last reply — for the UI badge. */
  speechProvider: SpeechProvider | null;
  /** Voice capture availability (mic + recognition). */
  supported: boolean;
  /** Terminal error that ended the last call (e.g. mic permission denied). */
  error: VoiceErrorCode | null;
  /** Start the call: opens the mic. */
  startCall: () => void;
  /** End the call at any point; silences audio and releases the mic. */
  endCall: () => void;
  /** Finish the user's turn: stops the mic and hands the transcript to the AI. */
  finishTurn: () => void;
}

export function useVoiceCall(
  assistant: UseAssistantReturn,
): UseVoiceCallReturn {
  const { sendMessage } = assistant;
  const { speak, stop: stopSpeaking, lastProvider } = useSpeech();

  // One deferred resolver per listening turn — armed in finishTurn, resolved
  // by useVoiceInput's onResult the moment transcription settles.
  const resolveTurnRef = React.useRef<((outcome: VoiceOutcome) => void) | null>(
    null,
  );

  const handleVoiceResult = React.useCallback((outcome: VoiceOutcome) => {
    const resolve = resolveTurnRef.current;
    resolveTurnRef.current = null;
    resolve?.(outcome);
  }, []);

  const voice = useVoiceInput("ur-PK", { onResult: handleVoiceResult });

  const [status, setStatus] = React.useState<VoiceCallStatus>("idle");
  const [callError, setCallError] = React.useState<VoiceErrorCode | null>(null);

  // Whether a call is logically active — survives across status changes and
  // lets the async loop bail out the moment the user hangs up.
  const activeRef = React.useRef(false);

  const { startListening, stopListening, reset } = voice;

  const endCall = React.useCallback(() => {
    activeRef.current = false;
    resolveTurnRef.current = null;
    stopSpeaking();
    // Stopping while listening releases the mic (recorder.onstop → stream
    // teardown); any in-flight transcript is discarded via the nulled resolver.
    if (voice.isListening) stopListening();
    reset();
    setStatus("idle");
  }, [stopSpeaking, stopListening, reset, voice.isListening]);

  // Mic permission loss ends the call — there is no way to continue hands-free.
  // Deferred via queueMicrotask (React 19: no synchronous setState in effects).
  React.useEffect(() => {
    if (voice.error === "mic-denied" && status !== "idle") {
      queueMicrotask(() => {
        setCallError("mic-denied");
        endCall();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.error, status]);

  // ─── The turn loop ──────────────────────────────────────────────────────────

  const runTurn = React.useCallback(async () => {
    setStatus("transcribing");

    const outcome = await new Promise<VoiceOutcome>((resolve) => {
      resolveTurnRef.current = resolve;
    });
    if (!activeRef.current) return;

    const text = outcome.transcript.trim();
    if (!text) {
      // Nothing intelligible was captured — just listen again.
      setStatus("listening");
      startListening();
      return;
    }

    setStatus("thinking");
    let reply: string | null = null;
    try {
      reply = await sendMessage(text, "voice");
    } catch (err) {
      console.warn("[voiceCall] sending the turn failed:", err);
    }
    if (!activeRef.current) return;

    if (reply) {
      setStatus("speaking");
      await speak(reply);
      if (!activeRef.current) return;
    }

    // Loop: hand the floor back to the user.
    setStatus("listening");
    startListening();
  }, [sendMessage, speak, startListening]);

  const startCall = React.useCallback(() => {
    if (activeRef.current || !voice.supported) return;
    setCallError(null);
    activeRef.current = true;
    setStatus("listening");
    startListening();
  }, [voice.supported, startListening]);

  const finishTurn = React.useCallback(() => {
    if (!activeRef.current || status !== "listening") return;
    stopListening();
    void runTurn();
  }, [status, stopListening, runTurn]);

  // Release the mic on unmount if a call is somehow still live.
  React.useEffect(() => {
    return () => {
      activeRef.current = false;
      resolveTurnRef.current = null;
    };
  }, []);

  return {
    active: status !== "idle",
    status,
    interimTranscript: voice.interimTranscript,
    speechProvider: lastProvider,
    supported: voice.supported,
    error: callError,
    startCall,
    endCall,
    finishTurn,
  };
}
