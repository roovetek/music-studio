/**
 * MODE: Visual Challenge — Spectrogram (frequency × time).
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  FASTAPI PATH (when VITE_API_BASE_URL is set and reachable)     │
 * │  POST /api/visualize { file, mode:'spectrogram', style, lofi }  │
 * │  → { image_b64 }  ← librosa STFT + matplotlib specshow         │
 * │  → caller draws returned PNG into an <img> tag                  │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  BROWSER FALLBACK (server down or no env var)                   │
 * │  Uses stftMagnitudes() from src/utils/audio/fft.ts              │
 * │  Draws colourmap directly onto Canvas 2D                        │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { stftMagnitudes } from '../../../utils/audio/fft';

export type SpectrogramResult =
  | { source: 'fastapi'; imageB64: string }
  | { source: 'browser'; /* canvas was drawn directly */ drawn: true }
  | { source: 'error'; message: string };

/**
 * Try the FastAPI server first; on failure draw the browser fallback.
 * Returns metadata about which path was taken so the UI can show a badge.
 */
export async function renderSpectrogram(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  samples: Float32Array,
  sampleRate: number,
  file: File | null,
  style: 'dots' | 'lines',
  lofiSkip: number,
): Promise<SpectrogramResult> {
  // ── FastAPI PATH ──────────────────────────────────────────────────
  if (file) {
    const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
    const endpoint = apiBase ? `${apiBase}/api/visualize` : '/api/visualize';

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('mode', 'spectrogram');
      form.append('style', style);
      form.append('lofi_skip', String(lofiSkip));

      const res = await fetch(endpoint, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(20_000),
      });

      if (res.ok) {
        const json = (await res.json()) as { image_b64?: string };
        if (json.image_b64) {
          return { source: 'fastapi', imageB64: json.image_b64 };
        }
      }
    } catch {
      // Server unreachable → fall through to browser path
    }
  }

  // ── BROWSER FALLBACK ──────────────────────────────────────────────
  drawBrowserSpectrogram(ctx, w, h, samples, sampleRate);
  return { source: 'browser', drawn: true };
}

/** Client-side STFT spectrogram — adapted from FourierPage.tsx colourmap. */
function drawBrowserSpectrogram(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  samples: Float32Array,
  sampleRate: number,
): void {
  const fftSize = 2048;
  const hop = Math.max(1, Math.floor(fftSize * 0.5));
  const stft = stftMagnitudes(samples, sampleRate, { fftSize, hann: true, hop, maxFrames: 900 });

  const { mags, frameCount, binCount } = stft;
  const padL = 40;
  const padB = 22;
  const innerW = w - padL - 8;
  const innerH = h - padB - 6;

  // Find global max for normalisation
  let gMax = 1e-20;
  for (let i = 0; i < mags.length; i++) if (mags[i]! > gMax) gMax = mags[i]!;

  const drDb = 72;
  const img = ctx.createImageData(innerW, innerH);
  const data = img.data;

  for (let px = 0; px < innerW; px++) {
    const t = Math.min(frameCount - 1, Math.floor((px * frameCount) / innerW));
    for (let py = 0; py < innerH; py++) {
      const kb = binCount - 1 - Math.floor((py * binCount) / innerH);
      const mag = mags[t * binCount + kb] ?? 0;
      const d = 20 * Math.log10((mag + 1e-20) / (gMax + 1e-20));
      const u = Math.max(0, Math.min(1, (d + drDb) / drDb));
      const o = (py * innerW + px) * 4;
      data[o] = Math.floor(20 + 220 * (1 - u) * 0.3);
      data[o + 1] = Math.floor(40 + 180 * u);
      data[o + 2] = Math.floor(120 + 120 * (1 - u));
      data[o + 3] = 255;
    }
  }

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, w, h);
  ctx.putImageData(img, padL, 6);

  // Axis labels
  ctx.fillStyle = 'rgba(200,200,200,0.7)';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('time →', padL + innerW * 0.45, h - 6);
  ctx.save();
  ctx.translate(10, 6 + innerH * 0.5);
  ctx.rotate(-Math.PI * 0.5);
  ctx.textAlign = 'center';
  ctx.fillText('freq ↑', 0, 0);
  ctx.restore();
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(200,200,200,0.5)';
  ctx.fillText('0', padL - 2, 6 + innerH);
  ctx.fillText(`${Math.round(sampleRate / 2)} Hz`, padL - 2, 12);

  // "Browser fallback" badge
  ctx.fillStyle = 'rgba(234,179,8,0.65)';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Browser STFT (FastAPI offline)', padL + 4, h - 8);
}
