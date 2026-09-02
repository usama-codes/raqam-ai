// lib/ai/tts.ts — Urdu text-to-speech via Gemini TTS models.
//
// Speaks the assistant's replies for the hands-free voice-call mode. The
// request goes to the classic generateContent endpoint with
// responseModalities: ["AUDIO"] and a prebuilt voice; the response arrives as
// base64 16-bit little-endian mono PCM (default 24 kHz), which this module
// wraps in a WAV container server-side so the browser can play it directly.
//
// This module is pure: no Convex, no DOM. `fetch` is injectable so the TTS
// flow is unit-testable without network (mirrors lib/ai/transcription.ts).
// Imported from convex/ai.ts ("use node") and tests/unit/tts.test.ts.
//
// The client-side fallback (browser speechSynthesis, ur-PK) lives in
// hooks/useSpeech.ts and takes over when this module fails.

import { GEMINI_BASE_URL, TTS_MODELS } from "@/lib/ai/models";
import { base64ToBytes } from "@/lib/ai/transcription";
import { arrayBufferToBase64, parsePcmRate, pcm16ToWav } from "@/lib/audio/wav";

/** Default prebuilt voice — firm, warm, works well for Urdu. */
export const TTS_DEFAULT_VOICE = "Kore";

/** Default output sample rate for Gemini TTS audio. */
export const TTS_SAMPLE_RATE = 24_000;

/** Hard cap on speech input — a few minutes of audio, defensively. */
export const TTS_MAX_TEXT_LENGTH = 3_000;

export interface TtsOptions {
  apiKey: string;
  /** The text to speak. Markdown is stripped automatically. */
  text: string;
  /** Prebuilt Gemini voice name. Default "Kore". */
  voice?: string;
  /** Model chain override (defaults to TTS_MODELS). */
  models?: readonly string[];
  /** Injectable fetch (defaults to the global). */
  fetchImpl?: typeof fetch;
}

export interface TtsResult {
  /** Base64-encoded WAV audio — ready for `data:audio/wav;base64,…` playback. */
  wavBase64: string;
  /** Which model produced the audio. */
  modelUsed: string;
  /** The text actually spoken (after markdown stripping + truncation). */
  spokenText: string;
}

interface GeminiTtsResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { mimeType?: string; data?: string };
        // The REST API may return snake_case inline_data in some versions.
        inline_data?: { mime_type?: string; data?: string };
      }>;
    };
  }>;
  error?: { message?: string };
}

/**
 * Strip Markdown syntax that would sound wrong when spoken aloud — headings,
 * emphasis markers, bullets, links, code fences — while keeping the content.
 */
export function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images → alt text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → link text
    .replace(/```[a-zA-Z]*\n?([\s\S]*?)```/g, "$1") // code fences → content
    .replace(/`([^`]*)`/g, "$1") // inline code
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // bold
    .replace(/(\*|_)(.*?)\1/g, "$2") // italic
    .replace(/^\s*[-*+]\s+/gm, "") // bullets
    .replace(/^\s*>\s?/gm, "") // block quotes
    .replace(/\|/g, " ") // table pipes
    .replace(/\n{3,}/g, "\n\n") // collapse extra blank lines
    .trim();
}

/**
 * Synthesize speech: try each model in the chain until one returns audio.
 * Throws only when every model fails — the caller (convex action) turns that
 * into a null result so the browser speechSynthesis fallback can take over.
 */
export async function synthesizeSpeechWithGemini(
  opts: TtsOptions,
): Promise<TtsResult> {
  const {
    apiKey,
    voice = TTS_DEFAULT_VOICE,
    models = TTS_MODELS,
    fetchImpl = fetch,
  } = opts;

  const spokenText = stripMarkdownForSpeech(opts.text).slice(
    0,
    TTS_MAX_TEXT_LENGTH,
  );

  const errors: string[] = [];

  for (const model of models) {
    try {
      const res = await fetchImpl(
        `${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: spokenText }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice },
                },
              },
            },
          }),
        },
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => "unknown");
        errors.push(`${model}: HTTP ${res.status} — ${errText.slice(0, 200)}`);
        continue; // Try next model
      }

      const data = (await res.json()) as GeminiTtsResponse;

      if (data.error) {
        errors.push(`${model}: API error — ${data.error.message ?? "unknown"}`);
        continue;
      }

      const part = data.candidates?.[0]?.content?.parts?.[0];
      const pcmBase64 =
        part?.inlineData?.data ?? part?.inline_data?.data ?? undefined;
      if (!pcmBase64) {
        errors.push(`${model}: response contained no audio data`);
        continue;
      }

      // Accept both the camelCase and snake_case response spellings.
      const mimeType =
        part?.inlineData?.mimeType ?? part?.inline_data?.mime_type ?? undefined;
      const sampleRate = parsePcmRate(mimeType, TTS_SAMPLE_RATE);

      // PCM → WAV → base64, so the browser can play it without extra work.
      const pcm = base64ToBytes(pcmBase64);
      const wav = pcm16ToWav(pcm, sampleRate);

      return {
        wavBase64: arrayBufferToBase64(wav),
        modelUsed: model,
        spokenText,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${model}: ${msg}`);
      continue;
    }
  }

  throw new Error(`All Gemini TTS models failed:\n${errors.join("\n")}`);
}
