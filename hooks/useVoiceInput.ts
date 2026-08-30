"use client";

// hooks/useVoiceInput.ts — Browser-based speech recognition using Web Speech API
// Uses lang="ur-PK" for Urdu recognition. Falls back to MediaRecorder + Gemini
// transcription when the Web Speech API network fails.

import * as React from "react";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";

// ─── Web Speech API type declarations ──────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

// ─── Hook interface ────────────────────────────────────────────────────────────

export interface UseVoiceInputReturn {
  /** Whether the microphone is actively recording */
  isListening: boolean;
  /** Whether audio is being transcribed (fallback mode, after recording stops) */
  processing: boolean;
  /** Final transcribed text (set after speech ends) */
  transcript: string;
  /** Live interim text while user is still speaking */
  interimTranscript: string;
  /** Start or toggle recording */
  startListening: () => void;
  /** Stop recording and finalize transcript */
  stopListening: () => void;
  /** Reset transcript and error state */
  reset: () => void;
  /**
   * Promise-based result waiter — reads from refs to avoid stale closures.
   * Resolves with { transcript, error } once transcription completes or fails.
   */
  waitForResult: () => Promise<{ transcript: string; error: string | null }>;
  /** Error or unsupported message */
  error: string | null;
  /** Whether the browser supports speech recognition or audio recording */
  supported: boolean;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useVoiceInput(lang: string = "ur-PK"): UseVoiceInputReturn {
  const [isListening, setIsListening] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const [transcript, setTranscript] = React.useState("");
  const [interimTranscript, setInterimTranscript] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // Refs that always reflect the latest state (for use in waitForResult)
  const transcriptRef = React.useRef("");
  const processingRef = React.useRef(false);
  const errorRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);
  React.useEffect(() => {
    processingRef.current = processing;
  }, [processing]);
  React.useEffect(() => {
    errorRef.current = error;
  }, [error]);

  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);
  // Track whether we *want* to be listening (survives across onend restarts)
  const shouldListenRef = React.useRef(false);
  // Track whether the recognition engine actually started
  const didStartRef = React.useRef(false);
  // Retry counter for premature onend
  const retryCountRef = React.useRef(0);
  // MediaRecorder fallback refs
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const fallbackActiveRef = React.useRef(false);
  // Prevent triggering fallback more than once per recording session
  const fallbackTriedRef = React.useRef(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transcribeAudio = useAction((api as any).ai.transcribeAudio);

  const supported =
    typeof window !== "undefined" &&
    (!!window.SpeechRecognition ||
      !!window.webkitSpeechRecognition ||
      !!navigator.mediaDevices?.getUserMedia);

  // ─── MediaRecorder fallback (Gemini transcription) ──────────────────────────

  const startMediaRecorderFallback = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      fallbackActiveRef.current = true;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType,
        });

        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1] ?? "";
          setProcessing(true);
          try {
            const result = await transcribeAudio({
              audioBase64: base64,
              mimeType: recorder.mimeType,
            });
            if (result?.transcript) {
              setTranscript(result.transcript);
            } else if (result?.error) {
              setError(result.error);
            } else {
              setError(
                lang === "ur-PK"
                  ? "آڈیو ٹرانسکرائب نہیں ہو سکی۔ براہ کرم دوبارہ کوشش کریں۔"
                  : "Could not transcribe audio. Please try again.",
              );
            }
          } catch {
            setError("Transcription failed. Please try again.");
          } finally {
            setProcessing(false);
            fallbackActiveRef.current = false;
          }
        };
      };

      recorder.onerror = () => {
        setError("Recording error. Please try again.");
        setIsListening(false);
        fallbackActiveRef.current = false;
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
    } catch {
      setError("Microphone access denied. Please allow microphone access.");
      setIsListening(false);
      fallbackActiveRef.current = false;
    }
  }, [lang, transcribeAudio]);

  // Ref bridge so the useEffect's onerror closure always has the latest fallback fn
  const fallbackFnRef = React.useRef(startMediaRecorderFallback);
  React.useEffect(() => {
    fallbackFnRef.current = startMediaRecorderFallback;
  }, [startMediaRecorderFallback]);

  // ─── Web Speech recognition setup ─────────────────────────────────────────

  // Lazily create the recognition instance
  React.useEffect(() => {
    if (!supported) return;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition!;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setTranscript((prev) => prev + final);
      }
      setInterimTranscript(interim);
    };

    recognition.onstart = () => {
      didStartRef.current = true;
      retryCountRef.current = 0;
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        shouldListenRef.current = false;
        setError("Microphone access denied. Please allow microphone access.");
        setIsListening(false);
      } else if (event.error === "no-speech") {
        // no-speech is non-fatal — let onend handle fallback if needed
      } else if (
        event.error === "network" ||
        event.error === "service-not-allowed"
      ) {
        // Web Speech API server unreachable — will fall back in onend
      } else if (event.error !== "aborted") {
        shouldListenRef.current = false;
        setError(`Speech error: ${event.error}`);
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setInterimTranscript("");

      // If the user explicitly stopped, clear processing and close out.
      if (!shouldListenRef.current) {
        processingRef.current = false;
        setIsListening(false);
        return;
      }

      // ── Premature onend (onstart never fired) — retry with backoff ──
      if (!didStartRef.current) {
        if (retryCountRef.current < 2) {
          retryCountRef.current++;
          setTimeout(() => {
            if (shouldListenRef.current && recognitionRef.current) {
              didStartRef.current = false;
              try {
                recognitionRef.current.start();
              } catch {
                // Already running — ignore
              }
            }
          }, 150 * retryCountRef.current);
          return;
        }
        // Retries exhausted — try MediaRecorder fallback
        if (!fallbackTriedRef.current) {
          fallbackTriedRef.current = true;
          fallbackFnRef.current();
          return;
        }
        shouldListenRef.current = false;
        setError(
          "Could not start speech recognition. Please check your microphone and try again.",
        );
        setIsListening(false);
        return;
      }

      // ── Recognition was running but stopped (continuous-mode gap) ──
      // Try to auto-restart for seamless continuous recording.
      didStartRef.current = false;
      try {
        recognition.start();
        // Restart call succeeded — wait for next cycle.
        return;
      } catch {
        // Restart failed — Web Speech API is unreliable on this browser.
        // Fall through to MediaRecorder fallback.
      }

      // ── Fallback to MediaRecorder + Gemini ──
      if (!fallbackTriedRef.current) {
        fallbackTriedRef.current = true;
        // Abort the broken Web Speech instance before starting MediaRecorder
        try {
          recognition.abort();
        } catch {
          // ignore
        }
        fallbackFnRef.current();
        return;
      }

      // Both Web Speech and fallback have failed — give up
      shouldListenRef.current = false;
      setError(
        "Speech recognition is not available. Please type your message instead.",
      );
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      shouldListenRef.current = false;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [supported, lang]);

  const startListening = React.useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
    setProcessing(false);
    transcriptRef.current = "";
    processingRef.current = false;
    errorRef.current = null;
    shouldListenRef.current = true;

    // If Web Speech API not available, go directly to MediaRecorder fallback
    if (!recognitionRef.current) {
      fallbackFnRef.current();
      return;
    }

    didStartRef.current = false;
    retryCountRef.current = 0;
    fallbackTriedRef.current = false;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // Already started — ignore
    }
  }, []);

  const stopListening = React.useCallback(() => {
    shouldListenRef.current = false;
    // Mark processing so waitForResult keeps waiting until async finalization
    processingRef.current = true;
    // Stop MediaRecorder fallback
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsListening(false);
      return;
    }
    // Stop Web Speech recognition
    if (!recognitionRef.current) {
      processingRef.current = false;
      return;
    }
    recognitionRef.current.stop();
    setIsListening(false);
    // processingRef stays true until onend fires and clears it
  }, []);

  const reset = React.useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
    setProcessing(false);
    transcriptRef.current = "";
    processingRef.current = false;
    errorRef.current = null;
  }, []);

  const waitForResult = React.useCallback((): Promise<{
    transcript: string;
    error: string | null;
  }> => {
    return new Promise((resolve) => {
      let elapsed = 0;
      const check = () => {
        elapsed += 300;
        if (transcriptRef.current) {
          resolve({ transcript: transcriptRef.current, error: null });
        } else if (errorRef.current && !processingRef.current) {
          resolve({ transcript: "", error: errorRef.current });
        } else if (!processingRef.current && elapsed > 1000) {
          // Processing done but no transcript/error — empty result (Web Speech no-speech)
          resolve({ transcript: "", error: null });
        } else if (elapsed > 30000) {
          // Safety timeout: 30 seconds max
          resolve({
            transcript: "",
            error: "Timed out waiting for transcription.",
          });
        } else {
          setTimeout(check, 300);
        }
      };
      check();
    });
  }, []);

  return {
    isListening,
    processing,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    reset,
    waitForResult,
    error,
    supported,
  };
}
