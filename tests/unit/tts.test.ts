import { describe, it, expect, vi } from "vitest";
import {
  synthesizeSpeechWithGemini,
  stripMarkdownForSpeech,
  TTS_DEFAULT_VOICE,
  TTS_MAX_TEXT_LENGTH,
} from "@/lib/ai/tts";

// ─── Fake fetch helpers ────────────────────────────────────────────────────────

function jsonResponse(
  body: unknown,
  init: { ok?: boolean; status?: number } = {},
): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/** A Gemini TTS response carrying `pcm` as base64 inline audio. */
function ttsResponse(
  pcm: Uint8Array,
  opts: { mimeType?: string; snakeCase?: boolean } = {},
): Response {
  const data = Buffer.from(pcm).toString("base64");
  const mimeType = opts.mimeType ?? "audio/L16;codec=pcm;rate=24000";
  const part = opts.snakeCase
    ? { inline_data: { mime_type: mimeType, data } }
    : { inlineData: { mimeType, data } };
  return jsonResponse({ candidates: [{ content: { parts: [part] } }] });
}

function headerUint32(buf: Buffer, offset: number): number {
  return new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint32(
    offset,
    true,
  );
}

// ─── stripMarkdownForSpeech ───────────────────────────────────────────────────

describe("stripMarkdownForSpeech", () => {
  it("reads links and images as their plain text", () => {
    expect(
      stripMarkdownForSpeech("دیکھیں [گائیڈ](https://example.com) ہے"),
    ).toBe("دیکھیں گائیڈ ہے");
    expect(stripMarkdownForSpeech("![رسید](https://example.com/r.png)")).toBe(
      "رسید",
    );
  });

  it("reads code fences and inline code as their content", () => {
    expect(stripMarkdownForSpeech("```\n50 rupees\n```")).toBe("50 rupees");
    expect(stripMarkdownForSpeech("قیمت `1,200` روپے")).toBe("قیمت 1,200 روپے");
  });

  it("drops heading markers, bold, and italic emphasis", () => {
    expect(stripMarkdownForSpeech("## سرخی")).toBe("سرخی");
    expect(stripMarkdownForSpeech("####سرخی")).toBe("####سرخی"); // no space after # — left alone
    expect(stripMarkdownForSpeech("**اہم** بات")).toBe("اہم بات");
    expect(stripMarkdownForSpeech("__اہم__ بات")).toBe("اہم بات");
    expect(stripMarkdownForSpeech("*نرم* لہجہ")).toBe("نرم لہجہ");
  });

  it("reads bullets and block quotes as plain lines", () => {
    expect(stripMarkdownForSpeech("- پہلا\n* دوسرا\n+ تیسرا")).toBe(
      "پہلا\nدوسرا\nتیسرا",
    );
    expect(stripMarkdownForSpeech("> نصیحت")).toBe("نصیحت");
  });

  it("reads table pipes as pauses and collapses extra blank lines", () => {
    expect(stripMarkdownForSpeech("آمد | خرچ")).toBe("آمد   خرچ");
    expect(stripMarkdownForSpeech("ایک\n\n\n\nدو")).toBe("ایک\n\nدو");
    expect(stripMarkdownForSpeech("  سلام  ")).toBe("سلام"); // trims ends
  });
});

// ─── synthesizeSpeechWithGemini ────────────────────────────────────────────────

describe("synthesizeSpeechWithGemini", () => {
  const pcm = new Uint8Array([0x00, 0x01, 0xfe, 0xff, 0x40, 0x00]);

  it("returns WAV-wrapped audio the browser can play directly", async () => {
    const fetchImpl = vi.fn(async () =>
      ttsResponse(pcm),
    ) as unknown as typeof fetch;

    const res = await synthesizeSpeechWithGemini({
      apiKey: "test-key",
      text: "سلام! آج آپ کا بجٹ کیسا ہے؟",
      models: ["tts-1"],
      fetchImpl,
    });

    expect(res.modelUsed).toBe("tts-1");
    expect(res.spokenText).toBe("سلام! آج آپ کا بجٹ کیسا ہے؟");

    const wav = Buffer.from(res.wavBase64, "base64");
    expect(wav.length).toBe(44 + pcm.length);
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(headerUint32(wav, 24)).toBe(24_000); // sample rate from the mimeType
    expect(headerUint32(wav, 28)).toBe(48_000); // byte rate = 24 kHz × 2 bytes
    // PCM payload is passed through verbatim — no re-encoding.
    expect(Array.from(wav.subarray(44))).toEqual(Array.from(pcm));
  });

  it("requests AUDIO modality with the prebuilt voice configuration", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), init });
        return ttsResponse(pcm);
      },
    ) as unknown as typeof fetch;

    await synthesizeSpeechWithGemini({
      apiKey: "test-key",
      text: "سلام",
      models: ["tts-1"],
      fetchImpl,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/tts-1:generateContent?key=test-key",
    );

    const body = JSON.parse(String(calls[0]!.init?.body));
    expect(body.contents).toEqual([{ parts: [{ text: "سلام" }] }]);
    expect(body.generationConfig.responseModalities).toEqual(["AUDIO"]);
    expect(
      body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig
        .voiceName,
    ).toBe(TTS_DEFAULT_VOICE);
  });

  it("honors a custom voice name", async () => {
    const calls: Array<{ init?: RequestInit }> = [];
    const fetchImpl = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        calls.push({ init });
        return ttsResponse(pcm);
      },
    ) as unknown as typeof fetch;

    await synthesizeSpeechWithGemini({
      apiKey: "test-key",
      text: "سلام",
      voice: "Aoede",
      models: ["tts-1"],
      fetchImpl,
    });

    const body = JSON.parse(String(calls[0]!.init?.body));
    expect(
      body.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig
        .voiceName,
    ).toBe("Aoede");
  });

  it("strips markdown and truncates before speaking", async () => {
    let sentText = "";
    const fetchImpl = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        sentText = (
          JSON.parse(String(init?.body)) as {
            contents: Array<{ parts: Array<{ text: string }> }>;
          }
        ).contents[0]!.parts[0]!.text;
        return ttsResponse(pcm);
      },
    ) as unknown as typeof fetch;

    const res = await synthesizeSpeechWithGemini({
      apiKey: "test-key",
      text: "**سلام**\n\n# عنوان\n[لنک](https://x.example)",
      models: ["tts-1"],
      fetchImpl,
    });

    expect(sentText).toBe("سلام\n\nعنوان\nلنک");
    expect(res.spokenText).toBe("سلام\n\nعنوان\nلنک");

    // And the hard cap:
    const long = await synthesizeSpeechWithGemini({
      apiKey: "test-key",
      text: "x".repeat(TTS_MAX_TEXT_LENGTH + 500),
      models: ["tts-1"],
      fetchImpl,
    });
    expect(long.spokenText.length).toBe(TTS_MAX_TEXT_LENGTH);
  });

  it("parses the snake_case inline_data spelling some API versions return", async () => {
    const fetchImpl = vi.fn(async () =>
      ttsResponse(pcm, { snakeCase: true }),
    ) as unknown as typeof fetch;

    const res = await synthesizeSpeechWithGemini({
      apiKey: "test-key",
      text: "سلام",
      models: ["tts-1"],
      fetchImpl,
    });

    const wav = Buffer.from(res.wavBase64, "base64");
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(headerUint32(wav, 24)).toBe(24_000); // rate read from mime_type too
  });

  it("reads the sample rate from the mimeType when it differs", async () => {
    const fetchImpl = vi.fn(async () =>
      ttsResponse(pcm, { mimeType: "audio/L16;codec=pcm;rate=16000" }),
    ) as unknown as typeof fetch;

    const res = await synthesizeSpeechWithGemini({
      apiKey: "test-key",
      text: "سلام",
      models: ["tts-1"],
      fetchImpl,
    });

    expect(headerUint32(Buffer.from(res.wavBase64, "base64"), 24)).toBe(16_000);
  });

  it("falls through the model chain when a model 404s", async () => {
    const urls: string[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      urls.push(u);
      if (u.includes("/tts-1:")) {
        return jsonResponse(
          { error: { message: "model not found" } },
          {
            ok: false,
            status: 404,
          },
        );
      }
      return ttsResponse(pcm);
    }) as unknown as typeof fetch;

    const res = await synthesizeSpeechWithGemini({
      apiKey: "test-key",
      text: "سلام",
      models: ["tts-1", "tts-2"],
      fetchImpl,
    });

    expect(res.modelUsed).toBe("tts-2");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(urls[0]).toContain("/tts-1:");
    expect(urls[1]).toContain("/tts-2:");
  });

  it("falls through when a 200 response carries no audio data", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("/tts-1:")) {
        return jsonResponse({ candidates: [{ content: { parts: [] } }] });
      }
      return ttsResponse(pcm);
    }) as unknown as typeof fetch;

    const res = await synthesizeSpeechWithGemini({
      apiKey: "test-key",
      text: "سلام",
      models: ["tts-1", "tts-2"],
      fetchImpl,
    });

    expect(res.modelUsed).toBe("tts-2");
  });

  it("throws with every model's error when the whole chain fails", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(
        { error: { message: "quota exceeded" } },
        {
          ok: false,
          status: 429,
        },
      ),
    ) as unknown as typeof fetch;

    await expect(
      synthesizeSpeechWithGemini({
        apiKey: "test-key",
        text: "سلام",
        models: ["tts-1", "tts-2"],
        fetchImpl,
      }),
    ).rejects.toThrow(/All Gemini TTS models failed/);

    expect(fetchImpl).toHaveBeenCalledTimes(2); // every model was tried
  });
});
