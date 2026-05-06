/**
 * MODE: Visual Art — Amplitude vs. Time waveform.
 *
 * BROWSER PATH: pure Canvas 2D; no server call.
 * style='lines' → polyline across all samples (downsampled to canvas width).
 * style='dots'  → filled circles, one per pixel column.
 */

import { clearCanvas, type RenderOptions } from './shared';

export function renderWaveform(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  samples: Float32Array,
  opts: RenderOptions,
): void {
  clearCanvas(ctx, w, h);

  const mid = h / 2;
  const amp = h / 2 - 4;
  const step = Math.max(1, Math.floor(samples.length / w));

  ctx.strokeStyle = opts.accentColor;
  ctx.fillStyle = opts.accentColor;
  ctx.lineWidth = 1.5;

  if (opts.style === 'lines') {
    ctx.beginPath();
    for (let px = 0; px < w; px++) {
      const i = Math.min(samples.length - 1, px * step);
      const y = mid - (samples[i]! * amp);
      if (px === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();
  } else {
    // dots: small circle per pixel column
    const r = 1.5;
    for (let px = 0; px < w; px++) {
      const i = Math.min(samples.length - 1, px * step);
      const y = mid - (samples[i]! * amp);
      ctx.beginPath();
      ctx.arc(px, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
