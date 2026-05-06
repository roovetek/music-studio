/**
 * Shared types and helpers for all Sonic Lab canvas renderers.
 *
 * BROWSER PATH — all renderers run entirely in the browser via Canvas 2D.
 */

export type PlotStyle = 'dots' | 'lines';

export type RenderOptions = {
  style: PlotStyle;
  /** Accent colour (CSS colour string) drawn from --app-accent via the caller. */
  accentColor: string;
  /** Secondary / fill colour. */
  fillColor: string;
};

export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, 0, w, h);
}

/** Draw a centred "no data" placeholder. */
export function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  msg = 'Load audio to see visualisation',
): void {
  clearCanvas(ctx, w, h);
  ctx.fillStyle = 'rgba(200,200,200,0.4)';
  ctx.font = `14px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(msg, w / 2, h / 2);
}
