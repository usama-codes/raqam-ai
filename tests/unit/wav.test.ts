import { describe, it, expect } from "vitest";
import {
  encodeWav,
  downsampleMono,
  mixToMono,
  arrayBufferToBase64,
  pcm16ToWav,
  parsePcmRate,
  TARGET_SAMPLE_RATE,
} from "@/lib/audio/wav";

function ascii(view: DataView, offset: number, length: number): string {
  let s = "";
  for (let i = 0; i < length; i++)
    s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}

describe("encodeWav", () => {
  it("writes a canonical 44-byte PCM header", () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1]);
    const buf = encodeWav(samples, 16_000);
    const view = new DataView(buf);

    expect(buf.byteLength).toBe(44 + samples.length * 2);
    expect(ascii(view, 0, 4)).toBe("RIFF");
    expect(view.getUint32(4, true)).toBe(36 + samples.length * 2);
    expect(ascii(view, 8, 4)).toBe("WAVE");
    expect(ascii(view, 12, 4)).toBe("fmt ");
    expect(view.getUint32(16, true)).toBe(16); // fmt length
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(16_000); // sample rate
    expect(view.getUint32(28, true)).toBe(16_000 * 2); // byte rate
    expect(view.getUint16(32, true)).toBe(2); // block align
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
    expect(ascii(view, 36, 4)).toBe("data");
    expect(view.getUint32(40, true)).toBe(samples.length * 2);
  });

  it("encodes samples as little-endian Int16 and clips out-of-range values", () => {
    const buf = encodeWav(new Float32Array([0, 1, -1, 2, -2]), 8_000);
    const view = new DataView(buf);
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(32767); // +1 → max
    expect(view.getInt16(48, true)).toBe(-32768); // -1 → min
    expect(view.getInt16(50, true)).toBe(32767); // +2 clipped
    expect(view.getInt16(52, true)).toBe(-32768); // -2 clipped
  });

  it("produces an empty data section for empty input", () => {
    const buf = encodeWav(new Float32Array([]), 16_000);
    expect(buf.byteLength).toBe(44);
  });
});

describe("downsampleMono", () => {
  it("returns a copy unchanged when the target rate is >= input", () => {
    const input = new Float32Array([1, 2, 3]);
    const out = downsampleMono(input, 16_000, 48_000);
    expect(Array.from(out)).toEqual([1, 2, 3]);
    expect(out).not.toBe(input);
  });

  it("halves the length when downsampling 2:1 and averages", () => {
    const input = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7]);
    const out = downsampleMono(input, 32_000, 16_000);
    expect(out.length).toBe(4);
    // window [0,1] avg 0.5, [2,3] avg 2.5, ...
    expect(out[0]).toBeCloseTo(0.5);
    expect(out[1]).toBeCloseTo(2.5);
  });

  it("downsamples 48k → 16k to roughly a third of the samples", () => {
    const input = new Float32Array(4800).fill(0.2);
    const out = downsampleMono(input, 48_000, TARGET_SAMPLE_RATE);
    expect(out.length).toBe(1600);
    expect(out[0]).toBeCloseTo(0.2);
  });
});

describe("mixToMono", () => {
  it("passes a single channel through as a copy", () => {
    const ch = new Float32Array([0.1, 0.2]);
    const out = mixToMono([ch]);
    expect(out.length).toBe(2);
    expect(out[0]).toBeCloseTo(0.1);
    expect(out[1]).toBeCloseTo(0.2);
    expect(out).not.toBe(ch);
  });

  it("averages stereo channels", () => {
    const out = mixToMono([
      new Float32Array([0, 1, 0.5]),
      new Float32Array([1, 0, -0.5]),
    ]);
    expect(out[0]).toBeCloseTo(0.5);
    expect(out[1]).toBeCloseTo(0.5);
    expect(out[2]).toBeCloseTo(0);
  });

  it("returns an empty array for no channels", () => {
    expect(mixToMono([]).length).toBe(0);
  });
});

describe("pcm16ToWav", () => {
  it("writes a canonical 44-byte header around the raw PCM samples", () => {
    const pcm = new Uint8Array([0x01, 0x80, 0xff, 0x7f]);
    const buf = pcm16ToWav(pcm, 24_000);
    const view = new DataView(buf);

    expect(buf.byteLength).toBe(44 + 4);
    expect(ascii(view, 0, 4)).toBe("RIFF");
    expect(view.getUint32(4, true)).toBe(36 + 4);
    expect(ascii(view, 8, 4)).toBe("WAVE");
    expect(ascii(view, 12, 4)).toBe("fmt ");
    expect(view.getUint32(16, true)).toBe(16); // fmt length
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(24_000); // sample rate
    expect(view.getUint32(28, true)).toBe(24_000 * 2); // byte rate
    expect(view.getUint16(32, true)).toBe(2); // block align
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
    expect(ascii(view, 36, 4)).toBe("data");
    expect(view.getUint32(40, true)).toBe(4);
    // The PCM payload is copied verbatim — never re-encoded.
    expect(Array.from(new Uint8Array(buf, 44))).toEqual([
      0x01, 0x80, 0xff, 0x7f,
    ]);
  });

  it("produces an empty data section for empty input", () => {
    expect(pcm16ToWav(new Uint8Array(0), 24_000).byteLength).toBe(44);
  });
});

describe("parsePcmRate", () => {
  it("extracts the rate from a Gemini TTS mimeType", () => {
    expect(parsePcmRate("audio/L16;codec=pcm;rate=24000")).toBe(24_000);
    expect(parsePcmRate("audio/L16;codec=pcm;rate=16000")).toBe(16_000);
  });

  it("falls back when the mimeType has no rate or is missing", () => {
    expect(parsePcmRate("audio/wav")).toBe(24_000);
    expect(parsePcmRate(null)).toBe(24_000);
    expect(parsePcmRate(undefined)).toBe(24_000);
    expect(parsePcmRate("audio/wav", 22_050)).toBe(22_050);
  });
});

describe("arrayBufferToBase64", () => {
  it("round-trips through Buffer", () => {
    const bytes = new Uint8Array([1, 2, 3, 250]);
    const b64 = arrayBufferToBase64(bytes.buffer);
    expect(Array.from(Buffer.from(b64, "base64"))).toEqual([1, 2, 3, 250]);
  });

  it("produces a decodable WAV blob end to end", () => {
    const wav = encodeWav(new Float32Array([0, 0.25, -0.25]), 16_000);
    const b64 = arrayBufferToBase64(wav);
    const decoded = Buffer.from(b64, "base64");
    expect(decoded.length).toBe(wav.byteLength);
    expect(decoded.toString("ascii", 0, 4)).toBe("RIFF");
  });
});
