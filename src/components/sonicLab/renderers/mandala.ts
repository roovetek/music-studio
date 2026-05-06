/**
 * MODE: Mandala Art — polar plot.
 *
 * BROWSER PATH: pure Canvas 2D; no server call.
 * Maps time → angle (θ) and amplitude → radius (r):
 *   θ = 2π × (i / n)
 *   r = baseRadius + amplitude × scale
 *
 * style='lines' → continuous polar polyline (creates flowing mandala shapes).
 * style='dots'  → polar scatter (granular starburst effect).
 */

import { clearCanvas, type RenderOptions } from './shared';

export function renderMandala(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  samples: Float32Array,
  opts: RenderOptions,
): void {
  clearCanvas(ctx, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.min(cx, cy) - 8;
  const baseR = maxR * 0.25;
  const ampScale = maxR * 0.72;

  const n = samples.length;
  const twoPi = 2 * Math.PI;

  const [r, g, b] = hexOrCssToRgb(opts.accentColor);

  if (opts.style === 'lines') {
    // Gradient effect: alpha tied to amplitude magnitude
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const theta = (twoPi * i) / n;
      const radius = baseR + samples[i]! * ampScale;
      const x = cx + radius * Math.cos(theta);
      const y = cy + radius * Math.sin(theta);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${r},${g},${b},0.55)`;
    ctx.stroke();

    // Mirror (second pass rotated π to fill the mandala)
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const theta = (twoPi * i) / n + Math.PI;
      const radius = baseR + samples[i]! * ampScale;
      const x = cx + radius * Math.cos(theta);
      const y = cy + radius * Math.sin(theta);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${r},${g},${b},0.3)`;
    ctx.stroke();
  } else {
    // dots: scatter points in polar coords
    const step = Math.max(1, Math.floor(n / (w * 2)));
    for (let i = 0; i < n; i += step) {
      const theta = (twoPi * i) / n;
      const radius = baseR + samples[i]! * ampScale;
      const x = cx + radius * Math.cos(theta);
      const y = cy + radius * Math.sin(theta);
      const alpha = 0.07 + 0.25 * Math.abs(samples[i]!);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Subtle centre circle
  ctx.strokeStyle = `rgba(${r},${g},${b},0.12)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, baseR, 0, twoPi);
  ctx.stroke();
}

function hexOrCssToRgb(color: string): [number, number, number] {
  if (color.startsWith('#') && color.length === 7) {
    return [
      parseInt(color.slice(1, 3), 16),
      parseInt(color.slice(3, 5), 16),
      parseInt(color.slice(5, 7), 16),
    ];
  }
  const m = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return [14, 165, 233];
}
