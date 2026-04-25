import type { StrumToken } from '../../data/guitarStrumPatterns';
import { ACCENT_MULT, type MetronomeAccent } from '../metronomeAccent';

export type ConnectPattern = (node: GainNode) => void;

function playDrumHitKick(
  ctx: AudioContext,
  time: number,
  level: number,
  out: ConnectPattern,
) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(60, time);
  o.frequency.exponentialRampToValueAtTime(30, time + 0.12);
  g.gain.setValueAtTime(0.38 * level, time);
  g.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
  o.connect(g);
  out(g);
  o.start(time);
  o.stop(time + 0.22);
}

function playDrumHitSnare(
  ctx: AudioContext,
  time: number,
  level: number,
  getNoise: (c: AudioContext, seconds: number) => AudioBuffer,
  out: ConnectPattern,
) {
  const n = ctx.createBufferSource();
  n.buffer = getNoise(ctx, 0.08);
  const f = ctx.createBiquadFilter();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const mix = ctx.createGain();
  f.type = 'bandpass';
  f.frequency.value = 1200;
  f.Q.value = 1.2;
  o.type = 'square';
  o.frequency.value = 230;
  n.connect(f);
  f.connect(mix);
  o.connect(mix);
  g.gain.setValueAtTime(0.3 * level, time);
  g.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
  mix.connect(g);
  out(g);
  n.start(time);
  o.start(time);
  o.stop(time + 0.06);
  n.stop(time + 0.08);
}

function playDrumHitHiHat(
  ctx: AudioContext,
  time: number,
  level: number,
  getNoise: (c: AudioContext, seconds: number) => AudioBuffer,
  out: ConnectPattern,
) {
  const n = ctx.createBufferSource();
  n.buffer = getNoise(ctx, 0.04);
  const hp = ctx.createBiquadFilter();
  const g = ctx.createGain();
  hp.type = 'highpass';
  hp.frequency.value = 8000;
  g.gain.setValueAtTime(0.2 * level, time);
  g.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
  n.connect(hp);
  hp.connect(g);
  out(g);
  n.start(time);
  n.stop(time + 0.05);
}

export function playDrumPatternStepAt(
  ctx: AudioContext,
  time: number,
  grid16: number,
  accentLevel: MetronomeAccent,
  getDecayingNoiseBuffer: (c: AudioContext, seconds: number) => AudioBuffer,
  out: ConnectPattern,
) {
  const level = ACCENT_MULT[accentLevel];
  const s = ((grid16 % 16) + 16) % 16;
  if (s === 0) {
    playDrumHitKick(ctx, time, level, out);
    playDrumHitHiHat(ctx, time, level, getDecayingNoiseBuffer, out);
  } else if (s === 1 || s === 2 || s === 3 || s === 10) {
    playDrumHitHiHat(ctx, time, level, getDecayingNoiseBuffer, out);
  } else if (s === 4 || s === 12) {
    playDrumHitSnare(ctx, time, level, getDecayingNoiseBuffer, out);
    playDrumHitHiHat(ctx, time, level, getDecayingNoiseBuffer, out);
  } else if (s === 6 || s === 14) {
    playDrumHitKick(ctx, time, level, out);
  } else if (s === 8) {
    playDrumHitKick(ctx, time, level, out);
    playDrumHitHiHat(ctx, time, level, getDecayingNoiseBuffer, out);
  }
}

/**
 * Scales internal bol peaks so tabla beat source matches the same output target as kit clicks
 * (`npm run calibrate-metronome`, pattern path + master in `metronomeOutputGraph`).
 * Cap 6.5 in the script; Node polyfill is not identical to the browser.
 */
export const TABLA_BOL_GAIN = 6.5;

export function playTablaBolAt(
  ctx: AudioContext,
  time: number,
  bolIndex: number,
  accentLevel: MetronomeAccent,
  out: ConnectPattern,
  options?: { bolGain?: number },
) {
  const gMul = options?.bolGain ?? TABLA_BOL_GAIN;
  const bol = (bolIndex % 4) === 0 ? 'ta' : (bolIndex % 4) === 3 ? 'na' : 'dhin';
  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const g = ctx.createGain();
  const f1 = ctx.createBiquadFilter();
  const f2 = ctx.createBiquadFilter();
  o1.type = bol === 'dhin' ? 'sawtooth' : 'triangle';
  o2.type = 'triangle';
  f1.type = 'bandpass';
  f2.type = 'bandpass';

  if (bol === 'ta') {
    const peak = (accentLevel === 'first' ? 0.22 : accentLevel === 'normal' ? 0.2 : 0.14) * gMul;
    o1.frequency.setValueAtTime(248, time);
    o1.frequency.exponentialRampToValueAtTime(200, time + 0.1);
    o2.frequency.setValueAtTime(480, time);
    f1.frequency.value = 1080;
    f1.Q.value = 2.4;
    f2.frequency.value = 1880;
    f2.Q.value = 1.8;
    g.gain.setValueAtTime(peak, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.11);
  } else if (bol === 'dhin') {
    o1.frequency.setValueAtTime(256, time);
    o1.frequency.exponentialRampToValueAtTime(210, time + 0.14);
    o2.frequency.setValueAtTime(410, time);
    f1.frequency.value = 380;
    f1.Q.value = 2.2;
    f2.frequency.value = 920;
    f2.Q.value = 2.6;
    g.gain.setValueAtTime((accentLevel === 'first' ? 0.24 : 0.2) * gMul, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.18);
  } else {
    o1.frequency.setValueAtTime(290, time);
    o1.frequency.exponentialRampToValueAtTime(250, time + 0.05);
    o2.frequency.setValueAtTime(520, time);
    f1.type = 'highpass';
    f1.frequency.value = 1200;
    f1.Q.value = 0.6;
    f2.frequency.value = 1680;
    f2.Q.value = 2.8;
    g.gain.setValueAtTime(0.2 * gMul, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
  }

  o1.connect(f1);
  o2.connect(f2);
  f1.connect(g);
  f2.connect(g);
  out(g);
  o1.start(time);
  o2.start(time);
  const d = bol === 'dhin' ? 0.19 : bol === 'ta' ? 0.12 : 0.11;
  o1.stop(time + d);
  o2.stop(time + d);
}

function playGuitarPalmGhostAt(
  ctx: AudioContext,
  time: number,
  accentLevel: MetronomeAccent,
  out: ConnectPattern,
) {
  const base =
    accentLevel === 'first' ? 0.05 : accentLevel === 'normal' ? 0.042 : 0.034;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  o.type = 'triangle';
  o.frequency.setValueAtTime(145, time);
  o.frequency.exponentialRampToValueAtTime(90, time + 0.038);
  f.type = 'lowpass';
  f.frequency.value = 420;
  f.Q.value = 0.7;
  g.gain.setValueAtTime(0.001, time);
  g.gain.linearRampToValueAtTime(base, time + 0.004);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
  o.connect(f);
  f.connect(g);
  out(g);
  o.start(time);
  o.stop(time + 0.05);
}

export function playGuitarStrumAt(
  ctx: AudioContext,
  time: number,
  direction: 'down' | 'up',
  accentLevel: MetronomeAccent,
  out: ConnectPattern,
) {
  const freqs = [82, 123, 196, 294, 392];
  const n = freqs.length;
  const strumWindow = direction === 'down' ? 0.035 : 0.028;
  const decay = direction === 'down' ? 0.42 : 0.28;
  const baseGain = accentLevel === 'first' ? 0.1 : accentLevel === 'normal' ? 0.085 : 0.07;
  const order = direction === 'down' ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
  for (let k = 0; k < n; k += 1) {
    const i = order[k]!;
    const t0 = time + (k / (n - 1 || 1)) * strumWindow;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.value = freqs[i]!;
    bp.type = 'bandpass';
    bp.frequency.value = direction === 'down' ? 500 : 900;
    bp.Q.value = 1.1;
    g.gain.setValueAtTime(0.001, t0);
    g.gain.exponentialRampToValueAtTime(baseGain, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.01, t0 + decay);
    osc.connect(bp);
    bp.connect(g);
    out(g);
    osc.start(t0);
    osc.stop(t0 + decay + 0.02);
  }
}

/** D / U = full strum, G = palm / ghost, R = silent */
export function playGuitarStrumTokenAt(
  ctx: AudioContext,
  time: number,
  token: StrumToken,
  accentLevel: MetronomeAccent,
  out: ConnectPattern,
) {
  if (token === 'R') {
    return;
  }
  if (token === 'G') {
    playGuitarPalmGhostAt(ctx, time, accentLevel, out);
    return;
  }
  playGuitarStrumAt(ctx, time, token === 'D' ? 'down' : 'up', accentLevel, out);
}

function makeNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const n = Math.max(1, Math.ceil(ctx.sampleRate * seconds));
  const b = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i += 1) {
    d[i] = Math.random() * 2 - 1;
  }
  return b;
}

function reggaeGhostChiff(ctx: AudioContext, time: number, level: number, out: ConnectPattern) {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, 0.04);
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  f.type = 'bandpass';
  f.frequency.value = 900;
  f.Q.value = 1.1;
  g.gain.setValueAtTime(0.001, time);
  g.gain.linearRampToValueAtTime(0.04 * level, time + 0.003);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
  src.connect(f);
  f.connect(g);
  out(g);
  src.start(time);
  src.stop(time + 0.045);
}

/** Organ-skank: low-mid; U brighter than D; G = chiff, R = silent. */
export function playReggaeOneDropTokenAt(
  ctx: AudioContext,
  time: number,
  token: StrumToken,
  accentLevel: MetronomeAccent,
  out: ConnectPattern,
) {
  if (token === 'R') {
    return;
  }
  const level = ACCENT_MULT[accentLevel];
  if (token === 'G') {
    reggaeGhostChiff(ctx, time, level, out);
    return;
  }
  const up = token === 'U';
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const bp = ctx.createBiquadFilter();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(196, time);
  o.frequency.exponentialRampToValueAtTime(165, time + 0.08);
  bp.type = 'bandpass';
  bp.frequency.value = up ? 480 : 320;
  bp.Q.value = 1.4;
  const peak = (accentLevel === 'first' ? 0.11 : accentLevel === 'normal' ? 0.095 : 0.078) * level;
  g.gain.setValueAtTime(0.001, time);
  g.gain.exponentialRampToValueAtTime(peak, time + 0.004);
  g.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
  o.connect(bp);
  bp.connect(g);
  out(g);
  o.start(time);
  o.stop(time + 0.12);
}

/** Brassy offbeat chank. */
export function playSkaChankTokenAt(
  ctx: AudioContext,
  time: number,
  token: StrumToken,
  accentLevel: MetronomeAccent,
  out: ConnectPattern,
) {
  if (token === 'R') {
    return;
  }
  const level = ACCENT_MULT[accentLevel];
  if (token === 'G') {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const hp = ctx.createBiquadFilter();
    o.type = 'square';
    o.frequency.value = 880;
    hp.type = 'highpass';
    hp.frequency.value = 2000;
    g.gain.setValueAtTime(0.001, time);
    g.gain.exponentialRampToValueAtTime(0.04 * level, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.028);
    o.connect(hp);
    hp.connect(g);
    out(g);
    o.start(time);
    o.stop(time + 0.04);
    return;
  }
  const up = token === 'U';
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const bp = ctx.createBiquadFilter();
  o.type = 'square';
  o.frequency.value = up ? 1240 : 720;
  bp.type = 'bandpass';
  bp.frequency.value = up ? 2200 : 1500;
  bp.Q.value = 2.2;
  const peak = (up ? 0.12 : 0.1) * level;
  g.gain.setValueAtTime(0.001, time);
  g.gain.exponentialRampToValueAtTime(peak, time + 0.0025);
  g.gain.exponentialRampToValueAtTime(0.01, time + 0.055);
  o.connect(bp);
  bp.connect(g);
  out(g);
  o.start(time);
  o.stop(time + 0.07);
}

/** Soft nylon-ish pluck. */
export function playBossaNylonTokenAt(
  ctx: AudioContext,
  time: number,
  token: StrumToken,
  accentLevel: MetronomeAccent,
  out: ConnectPattern,
) {
  if (token === 'R') {
    return;
  }
  const level = ACCENT_MULT[accentLevel];
  if (token === 'G') {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    o.type = 'triangle';
    o.frequency.value = 196;
    lp.type = 'lowpass';
    lp.frequency.value = 800;
    g.gain.setValueAtTime(0.001, time);
    g.gain.exponentialRampToValueAtTime(0.045 * level, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    o.connect(lp);
    lp.connect(g);
    out(g);
    o.start(time);
    o.stop(time + 0.1);
    return;
  }
  const up = token === 'U';
  const f0 = up ? 349.23 : 329.63;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  o.type = 'triangle';
  o.frequency.value = f0;
  lp.type = 'lowpass';
  lp.frequency.value = 2200;
  lp.Q.value = 0.5;
  const peak = (accentLevel === 'first' ? 0.15 : 0.12) * level;
  g.gain.setValueAtTime(0.001, time);
  g.gain.linearRampToValueAtTime(peak, time + 0.006);
  g.gain.exponentialRampToValueAtTime(0.01, time + 0.32);
  o.connect(lp);
  lp.connect(g);
  out(g);
  o.start(time);
  o.stop(time + 0.45);
}

/** Short piano / montuno stab. */
export function playSalsaMontunoPianoTokenAt(
  ctx: AudioContext,
  time: number,
  token: StrumToken,
  accentLevel: MetronomeAccent,
  out: ConnectPattern,
) {
  if (token === 'R') {
    return;
  }
  const level = ACCENT_MULT[accentLevel];
  if (token === 'G') {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 330;
    g.gain.setValueAtTime(0.001, time);
    g.gain.exponentialRampToValueAtTime(0.04 * level, time + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    o.connect(g);
    out(g);
    o.start(time);
    o.stop(time + 0.08);
    return;
  }
  const up = token === 'U';
  const f1 = up ? 392 : 261.63;
  const f2 = f1 * 1.01;
  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  o1.type = 'triangle';
  o2.type = 'sawtooth';
  o1.frequency.value = f1;
  o2.frequency.value = f2;
  lp.type = 'lowpass';
  lp.frequency.value = 3000;
  const mix = ctx.createGain();
  const peak = (accentLevel === 'first' ? 0.11 : 0.095) * level;
  g.gain.setValueAtTime(0.001, time);
  g.gain.exponentialRampToValueAtTime(peak, time + 0.003);
  g.gain.exponentialRampToValueAtTime(0.01, time + 0.14);
  o1.connect(mix);
  o2.connect(mix);
  mix.connect(lp);
  lp.connect(g);
  out(g);
  o1.start(time);
  o2.start(time);
  o1.stop(time + 0.16);
  o2.stop(time + 0.16);
}

/** Pandeiro-like body and rim-ghost. */
export function playSambaPartidoTokenAt(
  ctx: AudioContext,
  time: number,
  token: StrumToken,
  accentLevel: MetronomeAccent,
  out: ConnectPattern,
) {
  if (token === 'R') {
    return;
  }
  const level = ACCENT_MULT[accentLevel];
  if (token === 'G') {
    const n = ctx.createBufferSource();
    n.buffer = makeNoiseBuffer(ctx, 0.025);
    const hp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    hp.type = 'highpass';
    hp.frequency.value = 5000;
    g.gain.setValueAtTime(0.03 * level, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
    n.connect(hp);
    hp.connect(g);
    out(g);
    n.start(time);
    n.stop(time + 0.03);
    return;
  }
  const o = ctx.createOscillator();
  const n = ctx.createBufferSource();
  n.buffer = makeNoiseBuffer(ctx, 0.06);
  const f = ctx.createBiquadFilter();
  const nF = ctx.createBiquadFilter();
  const gO = ctx.createGain();
  const gN = ctx.createGain();
  const sum = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(180, time);
  o.frequency.exponentialRampToValueAtTime(90, time + 0.1);
  f.type = 'lowpass';
  f.frequency.value = 400;
  nF.type = 'bandpass';
  nF.frequency.value = 350;
  nF.Q.value = 0.8;
  const body = 0.11 * level;
  gO.gain.setValueAtTime(0.001, time);
  gO.gain.exponentialRampToValueAtTime(body, time + 0.002);
  gO.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
  gN.gain.setValueAtTime(0.06 * level, time);
  gN.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  o.connect(f);
  f.connect(gO);
  n.connect(nF);
  nF.connect(gN);
  gO.connect(sum);
  gN.connect(sum);
  out(sum);
  o.start(time);
  n.start(time);
  o.stop(time + 0.15);
  n.stop(time + 0.07);
}

export function playPianoNoteAt(
  ctx: AudioContext,
  time: number,
  scaleDegree: number,
  accentLevel: MetronomeAccent,
  out: ConnectPattern,
) {
  const freqs = [261.63, 329.63, 392, 523.25];
  const idx = ((scaleDegree % 4) + 4) % 4;
  const f0 = freqs[idx]!;
  const peak = accentLevel === 'first' ? 0.2 : accentLevel === 'normal' ? 0.17 : 0.12;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  const peakEq = ctx.createBiquadFilter();
  o.type = 'sawtooth';
  o.frequency.value = f0;
  lp.type = 'lowpass';
  lp.frequency.value = 2200;
  lp.Q.value = 0.4;
  peakEq.type = 'peaking';
  peakEq.frequency.value = 1200;
  peakEq.gain.value = 2;
  peakEq.Q.value = 0.7;
  g.gain.setValueAtTime(0.001, time);
  g.gain.linearRampToValueAtTime(peak, time + 0.004);
  g.gain.setValueAtTime(peak * 0.5, time + 0.06);
  g.gain.exponentialRampToValueAtTime(0.01, time + 0.38);
  o.connect(lp);
  lp.connect(peakEq);
  peakEq.connect(g);
  out(g);
  o.start(time);
  o.stop(time + 0.4);
}

export function playViolinBowAt(
  ctx: AudioContext,
  time: number,
  accentLevel: MetronomeAccent,
  stepDurationSec: number,
  out: ConnectPattern,
) {
  const base = accentLevel === 'first' ? 440 : accentLevel === 'normal' ? 415 : 392;
  const o = ctx.createOscillator();
  const vib = ctx.createOscillator();
  const vibGain = ctx.createGain();
  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(base, time);
  vib.type = 'sine';
  vib.frequency.value = 5.2;
  vibGain.gain.value = 12;
  vib.connect(vibGain);
  vibGain.connect(o.frequency);
  lp.type = 'lowpass';
  lp.frequency.value = 1800;
  const sustain = Math.max(0.05, stepDurationSec - 0.19);
  const att = 0.08;
  g.gain.setValueAtTime(0.001, time);
  g.gain.linearRampToValueAtTime(accentLevel === 'first' ? 0.22 : 0.16, time + att);
  g.gain.setValueAtTime(accentLevel === 'first' ? 0.2 : 0.14, time + att + sustain);
  g.gain.exponentialRampToValueAtTime(0.01, time + att + sustain + 0.06);
  o.connect(lp);
  lp.connect(g);
  out(g);
  o.start(time);
  o.stop(time + att + sustain + 0.08);
  vib.start(time);
  vib.stop(time + att + sustain + 0.08);
}
