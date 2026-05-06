/**
 * Synthetic reference samples for the Gallery section.
 *
 * BROWSER PATH — generated entirely in the browser with pure math.
 * No audio files are fetched; no server is involved.
 *
 * Three pre-built AudioData objects:
 *   sine440   — 440 Hz pure tone (perfect circle in Phase Look)
 *   cMajor    — C4+E4+G4 chord (three horizontal lines in Spectrogram)
 *   tablaDha  — synthetic percussive hit (noise burst through resonant filter)
 */

import type { AudioData } from './loadAudio';

const SR = 44100;
const DUR = 2; // seconds
const N = SR * DUR;

function normalize(buf: Float32Array): Float32Array {
  let peak = 0;
  for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]!));
  if (peak < 1e-9) return buf;
  const inv = 0.9 / peak;
  const out = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) out[i] = (buf[i]! * inv);
  return out;
}

/** 440 Hz sine, stereo (L = R) so Phase Look shows a diagonal line. */
export function makeSine440(): AudioData {
  const buf = new Float32Array(N);
  const twoPi = 2 * Math.PI * 440;
  for (let i = 0; i < N; i++) buf[i] = Math.sin((twoPi * i) / SR);
  const ch = normalize(buf);
  return {
    name: 'Sine 440 Hz',
    sampleRate: SR,
    durationSec: DUR,
    channels: [ch, ch],
  };
}

/** C-Major chord: C4 (261.63) + E4 (329.63) + G4 (392.00), summed. */
export function makeCMajor(): AudioData {
  const freqs = [261.63, 329.63, 392.0];
  const buf = new Float32Array(N);
  for (const f of freqs) {
    const twoPi = 2 * Math.PI * f;
    for (let i = 0; i < N; i++) buf[i]! += Math.sin((twoPi * i) / SR);
  }
  const ch = normalize(buf);
  // Give it a very slight L/R decorrelation so Lissajous is interesting
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    L[i] = ch[i]!;
    R[i] = i >= 7 ? (ch[i - 7]! * 0.98) : 0;
  }
  return {
    name: 'C-Major Chord',
    sampleRate: SR,
    durationSec: DUR,
    channels: [normalize(L), normalize(R)],
  };
}

/**
 * Synthetic Tabla Dha: short noise burst fed through a resonant bandpass
 * centered near 180 Hz, then decayed exponentially.
 * Real tabla samples sound richer, but this illustrates the "sudden
 * explosion that disappears almost instantly" shape in Waveform view.
 */
export function makeTablaDha(): AudioData {
  const buf = new Float32Array(N);

  // Parameters tuned to sound vaguely tabla-like
  const DECAY_RATE = 18;    // envelope decay (higher = shorter)
  const RESONANCE_HZ = 180; // main resonant frequency
  const NOISE_FADE = 0.04;  // seconds of noise

  const twoPi = 2 * Math.PI * RESONANCE_HZ;

  // Simple one-pole lowpass state
  let lpState = 0;
  const lpAlpha = 0.15; // aggressive LP for the "thunk"

  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const env = Math.exp(-DECAY_RATE * t);
    // White noise for the attack transient
    const noise = t < NOISE_FADE ? (Math.random() * 2 - 1) * 0.6 : 0;
    // Resonant tone underneath
    const tone = Math.sin(twoPi * t) * 0.9;
    const raw = (noise + tone) * env;
    // Single-pole LP filter to smooth
    lpState = lpAlpha * raw + (1 - lpAlpha) * lpState;
    buf[i] = lpState;
  }

  const ch = normalize(buf);
  // Mono — Phase Look will offer Auto-Stereo
  return {
    name: 'Tabla Dha (synth)',
    sampleRate: SR,
    durationSec: DUR,
    channels: [ch],
  };
}
