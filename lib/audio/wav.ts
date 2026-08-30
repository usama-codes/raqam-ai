// lib/audio/wav.ts — Minimal 16-bit PCM WAV encoding for voice capture.
//
// Why this exists: MediaRecorder produces WebM/Opus (Chrome) or MP4/AAC (Safari).
// Google Gemini's audio input does NOT accept WebM, and container quirks trip up
// other engines too. Decoding the recording and re-encoding it as mono 16 kHz WAV
// before upload makes every transcription provider (AssemblyAI, Gemini)
// format-independent.
//
// Pure functions only — unit-tested in tests/unit/wav.test.ts. The browser glue
// that runs an AudioContext lives in hooks/useVoiceInput.ts.

/** Target sample rate for uploaded audio. 16 kHz is plenty for speech. */
export const TARGET_SAMPLE_RATE = 16_000;

function writeString(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

/**
 * Encode mono float samples (range [-1, 1]) as a 16-bit PCM WAV file.
 * The 44-byte canonical header is followed by little-endian Int16 samples.
 */
export function encodeWav(
  samples: Float32Array,
  sampleRate: number,
): ArrayBuffer {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk length
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

/**
 * Average-downsample mono float samples to a lower rate. Returns a copy
 * unchanged when the target rate is >= the input rate.
 */
export function downsampleMono(
  samples: Float32Array,
  inputRate: number,
  targetRate: number,
): Float32Array {
  if (targetRate >= inputRate || samples.length === 0) return samples.slice();
  const ratio = inputRate / targetRate;
  const outLength = Math.floor(samples.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.ceil((i + 1) * ratio), samples.length);
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += samples[j];
      count++;
    }
    out[i] = count > 0 ? sum / count : 0;
  }
  return out;
}

/** Mix an array of channel buffers down to a single mono track. */
export function mixToMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0].slice();
  const length = channels[0].length;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let c = 0; c < channels.length; c++) sum += channels[c][i] ?? 0;
    out[i] = sum / channels.length;
  }
  return out;
}

/** Base64-encode an ArrayBuffer (works in the browser and in Node). */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
