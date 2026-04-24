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

export function playTablaBolAt(
  ctx: AudioContext,
  time: number,
  bolIndex: number,
  accentLevel: MetronomeAccent,
  out: ConnectPattern,
) {
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
    const peak = accentLevel === 'first' ? 0.22 : accentLevel === 'normal' ? 0.2 : 0.14;
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
    g.gain.setValueAtTime(accentLevel === 'first' ? 0.24 : 0.2, time);
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
    g.gain.setValueAtTime(0.2, time);
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
