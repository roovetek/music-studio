/**
 * Audio loading helpers for the Sonic Fingerprint Lab.
 *
 * PATH SPLIT:
 *   Browser path  — decodes the file locally with Web Audio API (works on Pages / Capacitor).
 *   FastAPI path  — /api/fetch-url proxies remote URLs to dodge CORS; the browser
 *                   still decodes the returned bytes with decodeAudioData.
 */

export type AudioData = {
  name: string;
  sampleRate: number;
  durationSec: number;
  /** One entry per channel; stereo → length 2, mono → length 1. */
  channels: Float32Array[];
};

/** Shared decode logic once we have an ArrayBuffer. */
async function decodeBuffer(buf: ArrayBuffer, name: string): Promise<AudioData> {
  const ctx = new AudioContext();
  try {
    const audioBuf = await ctx.decodeAudioData(buf.slice(0));
    const channels: Float32Array[] = [];
    for (let c = 0; c < audioBuf.numberOfChannels; c++) {
      const src = audioBuf.getChannelData(c);
      const copy = new Float32Array(src.length);
      copy.set(src);
      channels.push(copy);
    }
    return {
      name,
      sampleRate: audioBuf.sampleRate,
      durationSec: audioBuf.duration,
      channels,
    };
  } finally {
    void ctx.close();
  }
}

/** BROWSER PATH — read a File object directly; no server involved. */
export async function decodeFile(file: File): Promise<AudioData> {
  const buf = await file.arrayBuffer();
  return decodeBuffer(buf, file.name);
}

/**
 * HYBRID PATH — load audio from a URL.
 *
 * 1. Try FastAPI proxy (/api/fetch-url) — avoids CORS and lets librosa log
 *    metadata server-side in the future.
 * 2. If FastAPI is unavailable (no VITE_API_BASE_URL or network error), fall
 *    back to a direct browser fetch (may hit CORS depending on the origin).
 */
export async function decodeUrl(url: string): Promise<AudioData> {
  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const proxyEndpoint = apiBase ? `${apiBase}/api/fetch-url` : '/api/fetch-url';

  let buf: ArrayBuffer | null = null;

  try {
    const res = await fetch(proxyEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      buf = await res.arrayBuffer();
    }
  } catch {
    // FastAPI not available — fall through to browser direct fetch
  }

  if (!buf) {
    // BROWSER FALLBACK — direct fetch; CORS may block depending on origin
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    buf = await res.arrayBuffer();
  }

  const name = url.split('/').pop()?.split('?')[0] ?? 'remote-audio';
  return decodeBuffer(buf, name);
}

/**
 * Apply Lo-Fi decimation: keep every `skip`-th sample.
 * skip=1 → no change; skip=8 → effective sample rate ÷ 8.
 */
export function applyLoFi(channels: Float32Array[], skip: number): Float32Array[] {
  if (skip <= 1) return channels;
  return channels.map((ch) => {
    const out = new Float32Array(Math.ceil(ch.length / skip));
    for (let i = 0, j = 0; i < ch.length; i += skip, j++) {
      out[j] = ch[i] ?? 0;
    }
    return out;
  });
}

