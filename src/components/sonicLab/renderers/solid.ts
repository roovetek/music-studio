/**
 * MODE: Solid Look — filled waveform silhouette.
 *
 * BROWSER PATH: pure Canvas 2D; no server call.
 * Uses fillBetween-style logic: for each pixel column find the min and max
 * amplitude in that bucket, then fill a rectangle from min-y to max-y.
 * This creates the "solid" shape described in the brief.
 *
 * style toggle is labelled "fill" in the UI — both styles are essentially
 * the same filled silhouette; 'dots' draws the top/bottom envelope as dots.
 */

import { clearCanvas, type RenderOptions } from './shared';

export function renderSolid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  samples: Float32Array,
  opts: RenderOptions,
): void {
  clearCanvas(ctx, w, h);

  const mid = h / 2;
  const amp = h / 2 - 4;
  const n = samples.length;

  ctx.fillStyle = opts.fillColor;
  ctx.strokeStyle = opts.accentColor;

  if (opts.style === 'lines') {
    // Filled silhouette via fill_between equivalent
    ctx.beginPath();
    ctx.moveTo(0, mid);

    // Top envelope (left to right)
    for (let px = 0; px < w; px++) {
      const start = Math.floor((px / w) * n);
      const end = Math.min(n, Math.floor(((px + 1) / w) * n));
      let maxVal = 0;
      for (let i = start; i < end; i++) maxVal = Math.max(maxVal, samples[i]!);
      ctx.lineTo(px, mid - maxVal * amp);
    }

    // Bottom envelope (right to left)
    for (let px = w - 1; px >= 0; px--) {
      const start = Math.floor((px / w) * n);
      const end = Math.min(n, Math.floor(((px + 1) / w) * n));
      let minVal = 0;
      for (let i = start; i < end; i++) minVal = Math.min(minVal, samples[i]!);
      ctx.lineTo(px, mid - minVal * amp);
    }

    ctx.closePath();
    ctx.fill();
  } else {
    // dots: draw top and bottom envelope as dots
    ctx.fillStyle = opts.accentColor;
    for (let px = 0; px < w; px++) {
      const start = Math.floor((px / w) * n);
      const end = Math.min(n, Math.floor(((px + 1) / w) * n));
      let maxVal = 0;
      let minVal = 0;
      for (let i = start; i < end; i++) {
        maxVal = Math.max(maxVal, samples[i]!);
        minVal = Math.min(minVal, samples[i]!);
      }
      // Filled bar between min and max
      const yTop = mid - maxVal * amp;
      const yBot = mid - minVal * amp;
      ctx.fillRect(px, yTop, 1, Math.max(1, yBot - yTop));
    }
  }
}
