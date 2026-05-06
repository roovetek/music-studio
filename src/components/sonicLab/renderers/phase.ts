/**
 * MODE: Phase Look — Lissajous figure (L channel as X, R channel as Y).
 *
 * BROWSER PATH: pure Canvas 2D; no server call.
 *
 * Mono handling:
 *   • Returns { needsStereo: true } when only one channel is present.
 *   • Caller shows toast with "Try Auto-Stereo" CTA.
 *   • If autoStereo channels are passed in, renders them with an
 *     "Auto-Stereo (faked)" watermark so users know it's not real L/R.
 */

import { clearCanvas, type RenderOptions } from './shared';

type PhaseResult =
  | { needsStereo: true }
  | { needsStereo: false };

export function renderPhase(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  channels: Float32Array[],
  opts: RenderOptions,
  isFaked = false,
): PhaseResult {
  if (channels.length < 2) {
    clearCanvas(ctx, w, h);
    return { needsStereo: true };
  }

  clearCanvas(ctx, w, h);

  const L = channels[0]!;
  const R = channels[1]!;
  const n = Math.min(L.length, R.length);
  const cx = w / 2;
  const cy = h / 2;
  const scale = Math.min(cx, cy) - 4;

  // Low alpha for density effect
  ctx.strokeStyle = opts.accentColor.replace(')', ', 0.12)').replace('rgb(', 'rgba(').replace('#', 'rgba_');
  ctx.fillStyle = opts.accentColor;

  // Build colour with alpha correctly
  const [r, g, b] = hexOrCssToRgb(opts.accentColor);
  const alpha = opts.style === 'dots' ? 0.06 : 0.05;
  const colorStr = `rgba(${r},${g},${b},${alpha})`;

  if (opts.style === 'lines') {
    ctx.strokeStyle = colorStr;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = cx + L[i]! * scale;
      const y = cy - R[i]! * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  } else {
    ctx.fillStyle = colorStr;
    for (let i = 0; i < n; i++) {
      const x = cx + L[i]! * scale;
      const y = cy - R[i]! * scale;
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Axes
  ctx.strokeStyle = 'rgba(200,200,200,0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
  ctx.moveTo(0, cy); ctx.lineTo(w, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  // Labels
  ctx.fillStyle = 'rgba(200,200,200,0.5)';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('L →', w - 20, cy + 14);
  ctx.fillText('R ↑', cx, 12);

  if (isFaked) {
    ctx.fillStyle = 'rgba(234,179,8,0.7)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Auto-Stereo (faked)', 8, h - 8);
  }

  return { needsStereo: false };
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
