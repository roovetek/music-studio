/**
 * Auto-Stereo: create a fake stereo pair from a mono signal.
 *
 * BROWSER PATH — pure TypeScript, no server needed. Duplicates the mono
 * channel into L and R, then delays R by `delaySamples` (≈ 10–20 ms at
 * 44100 Hz) to produce a subtle "haas effect" that makes the Lissajous
 * phase plot look like an ellipse rather than a diagonal line.
 *
 * The result is labelled "Auto-Stereo (faked)" in the UI so users know
 * it doesn't represent true L/R channel separation.
 */
export function autoStereo(
  mono: Float32Array,
  delaySamples = 12,
): [left: Float32Array, right: Float32Array] {
  const len = mono.length;
  const L = new Float32Array(len);
  const R = new Float32Array(len);

  L.set(mono);

  // R is the same signal but shifted forward by delaySamples
  for (let i = 0; i < len; i++) {
    const src = i - delaySamples;
    R[i] = src >= 0 ? (mono[src] ?? 0) : 0;
  }

  return [L, R];
}
