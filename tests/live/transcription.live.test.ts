// Live integration check against the real AssemblyAI API.
//
// Skipped automatically unless ASSEMBLYAI_API_KEY is present in the environment,
// so `npm test` and CI stay offline/deterministic. Run it explicitly with:
//
//   ASSEMBLYAI_API_KEY=<key> npx vitest run tests/live        (bash / git-bash)
//   $env:ASSEMBLYAI_API_KEY="<key>"; npx vitest run tests/live (PowerShell)

import { describe, it, expect } from "vitest";
import {
  transcribeWithAssemblyAI,
  transcribeAudioChain,
  ASSEMBLYAI_SPEECH_MODEL,
} from "@/lib/ai/transcription";

const KEY = process.env.ASSEMBLYAI_API_KEY;

// AssemblyAI's canonical public sample (English news audio, ~60s).
const SAMPLE_URL = "https://assembly.ai/wildfires.mp3";

async function fetchSample(): Promise<Uint8Array> {
  const res = await fetch(SAMPLE_URL);
  if (!res.ok) throw new Error(`sample download failed: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

describe.skipIf(!KEY)("AssemblyAI — live pipeline", () => {
  it(
    `transcribes a real recording with model "${ASSEMBLYAI_SPEECH_MODEL}"`,
    async () => {
      const audio = await fetchSample();
      const { transcript, languageCode } = await transcribeWithAssemblyAI({
        apiKey: KEY!,
        audio,
        pollIntervalMs: 3_000,
        timeoutMs: 180_000,
      });

      console.log(
        `[live] provider=assemblyai lang=${languageCode} chars=${transcript.length}`,
      );
      console.log(`[live] transcript: ${transcript.slice(0, 240)}…`);

      expect(transcript.length).toBeGreaterThan(50);
      expect(transcript.toLowerCase()).toContain("wildfire");
    },
    200_000,
  );

  it(
    "the fallback chain reports provider = 'assemblyai' end to end",
    async () => {
      const audio = await fetchSample();
      const base64 = Buffer.from(audio).toString("base64");

      const result = await transcribeAudioChain(
        { audioBase64: base64, mimeType: "audio/mpeg" },
        {
          transcribeAssemblyAI: (bytes) =>
            transcribeWithAssemblyAI({
              apiKey: KEY!,
              audio: bytes,
              pollIntervalMs: 3_000,
              timeoutMs: 180_000,
            }).then((r) => r.transcript),
          // No Gemini here — we're proving the primary provider path.
          onProviderError: (p, e) => console.error(`[live] ${p} failed`, e),
        },
      );

      expect(result.provider).toBe("assemblyai");
      expect(result.error).toBeNull();
      expect(result.transcript.length).toBeGreaterThan(50);
    },
    200_000,
  );
});
