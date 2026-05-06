/**
 * MODE: Density — scatter plot showing where amplitude "lives" most.
 *
 * BROWSER PATH: pure Canvas 2D; no server call.
 * Very low alpha (0.04) means areas with many samples darken/saturate into
 * a cloud shape — loud passages create bright dense bands.
 *
 * style='dots'  → tiny circles per sample bucket.
 * style='lines' → short vertical line segments per sample bucket.
 */

import { clearCanvas, type RenderOptions } from './shared';

export function renderDensity(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  samples: Float32Array,
  opts: RenderOptions,
): void {
  clearCanvas(ctx, w, h);

  const n = samples.length;
  const mid = h / 2;
  const amp = h / 2 - 4;

  // Parse accentColor to get RGB components for rgba() with low alpha
  const [r, g, b] = hexOrCssToRgb(opts.accentColor);
  const alpha = 0.04;
  const colorStr = `rgba(${r},${g},${b},${alpha})`;
  ctx.fillStyle = colorStr;
  ctx.strokeStyle = colorStr;

  if (opts.style === 'dots') {
    for (let i = 0; i < n; i++) {
      const x = (i / n) * w;
      const y = mid - (samples[i]! * amp);
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // lines: short vertical stroke per sample
    ctx.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      const x = (i / n) * w;
      const y = mid - (samples[i]! * amp);
      ctx.beginPath();
      ctx.moveTo(x, y - 2);
      ctx.lineTo(x, y + 2);
      ctx.stroke();
    }
  }
}

/** Fallback RGB parser: handles #rrggbb and a few known CSS colours. */
function hexOrCssToRgb(color: string): [number, number, number] {
  if (color.startsWith('#') && color.length === 7) {
    return [
      parseInt(color.slice(1, 3), 16),
      parseInt(color.slice(3, 5), 16),
      parseInt(color.slice(5, 7), 16),
    ];
  }
  // Try to extract rgb(r,g,b) or rgba(r,g,b,a)
  const m = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  // Fallback: sky blue
  return [14, 165, 233];
}
