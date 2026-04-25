/**
 * Frame-accurate peak / short-window level helpers for calibrating metronome one-shots.
 * Primary metric: full-scale sample peak (industry-typical for transient percussion; see EBU/ITU
 * for why integrated LUFS is not used for 40–200 ms hits).
 */
export const CEILING_FULL_SCALE = 0.891; // ≈ -1 dBFS, headroom for digital peak

export function maxAbsSample(buffer: AudioBuffer, channel = 0): number {
  const d = buffer.getChannelData(channel);
  let m = 0;
  for (let i = 0; i < d.length; i += 1) {
    const a = Math.abs(d[i]);
    if (a > m) {
      m = a;
    }
  }
  return m;
}

function rmsAt(buffer: AudioBuffer, channel: number, start: number, lengthSamples: number): number {
  const d = buffer.getChannelData(channel);
  const s = Math.max(0, Math.floor(start));
  const n = Math.min(Math.floor(lengthSamples), d.length - s);
  if (n <= 0) {
    return 0;
  }
  let acc = 0;
  for (let i = 0; i < n; i += 1) {
    const v = d[s + i];
    acc += v * v;
  }
  return Math.sqrt(acc / n);
}

/**
 * RMS in a 12 ms window centered on the sample with maximum |x| (optional secondary check).
 */
export function shortWindowRmsAfterPeak(
  buffer: AudioBuffer,
  windowMs = 12,
  sampleRate = buffer.sampleRate,
  channel = 0,
): number {
  const d = buffer.getChannelData(channel);
  let maxI = 0;
  let maxA = 0;
  for (let i = 0; i < d.length; i += 1) {
    const a = Math.abs(d[i]);
    if (a > maxA) {
      maxA = a;
      maxI = i;
    }
  }
  const len = (windowMs / 1000) * sampleRate;
  const start = maxI - len * 0.5;
  return rmsAt(buffer, channel, start, len);
}
