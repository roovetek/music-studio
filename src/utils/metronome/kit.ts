import { ACCENT_MULT, type MetronomeAccent } from '../metronomeAccent';
import type { MetronomeSound } from './catalog';

export type ConnectKit = (outputGain: GainNode) => void;

export function playKit808Rimshot(
  ctx: AudioContext,
  time: number,
  accentLevel: MetronomeAccent,
  out: ConnectKit,
) {
  const volume = 1.2 * ACCENT_MULT[accentLevel];
  const frequency = accentLevel === 'first' ? 1800 : accentLevel === 'normal' ? 1500 : 1200;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, time);
  oscillator.frequency.exponentialRampToValueAtTime(
    accentLevel === 'first' ? 1200 : accentLevel === 'normal' ? 1000 : 800,
    time + 0.01,
  );
  oscillator.frequency.exponentialRampToValueAtTime(
    accentLevel === 'first' ? 800 : accentLevel === 'normal' ? 600 : 400,
    time + 0.03,
  );

  filter.type = 'highpass';
  filter.frequency.value = 800;
  filter.Q.value = 2;

  gainNode.gain.setValueAtTime(volume, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

  oscillator.connect(filter);
  filter.connect(gainNode);
  out(gainNode);

  oscillator.start(time);
  oscillator.stop(time + 0.08);
}

export function playKitWoodblock(
  ctx: AudioContext,
  time: number,
  accentLevel: MetronomeAccent,
  out: ConnectKit,
) {
  const volume = 1.0 * ACCENT_MULT[accentLevel];
  const freq1 = accentLevel === 'first' ? 1800 : accentLevel === 'normal' ? 1600 : 1400;
  const freq2 = accentLevel === 'first' ? 2350 : accentLevel === 'normal' ? 2100 : 1850;

  const oscillator1 = ctx.createOscillator();
  const oscillator2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  oscillator1.type = 'square';
  oscillator1.frequency.value = freq1;

  oscillator2.type = 'square';
  oscillator2.frequency.value = freq2;

  filter.type = 'bandpass';
  filter.frequency.value = 1600;
  filter.Q.value = 5;

  gainNode.gain.setValueAtTime(volume, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.04);

  oscillator1.connect(filter);
  oscillator2.connect(filter);
  filter.connect(gainNode);
  out(gainNode);

  oscillator1.start(time);
  oscillator2.start(time);
  oscillator1.stop(time + 0.04);
  oscillator2.stop(time + 0.04);
}

export function playKitIndianClassical(
  ctx: AudioContext,
  time: number,
  accentLevel: MetronomeAccent,
  out: ConnectKit,
) {
  const volume = 1.1 * ACCENT_MULT[accentLevel];
  const baseFreq = accentLevel === 'first' ? 220 : accentLevel === 'normal' ? 196 : 165;

  const oscillator1 = ctx.createOscillator();
  const oscillator2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  oscillator1.type = 'triangle';
  oscillator1.frequency.value = baseFreq;

  oscillator2.type = 'triangle';
  oscillator2.frequency.value = baseFreq * 1.5;

  filter.type = 'bandpass';
  filter.frequency.value = 800;
  filter.Q.value = 3;

  gainNode.gain.setValueAtTime(volume, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

  const gain2 = ctx.createGain();
  gain2.gain.value = 0.6;

  oscillator1.connect(filter);
  oscillator2.connect(gain2);
  gain2.connect(filter);
  filter.connect(gainNode);
  out(gainNode);

  oscillator1.start(time);
  oscillator2.start(time);
  oscillator1.stop(time + 0.08);
  oscillator2.stop(time + 0.08);
}

export function playKitJazzBrush(
  ctx: AudioContext,
  time: number,
  accentLevel: MetronomeAccent,
  out: ConnectKit,
) {
  const volume = 1.0 * ACCENT_MULT[accentLevel];
  const freq1 = accentLevel === 'first' ? 2800 : accentLevel === 'normal' ? 2400 : 2000;
  const freq2 = accentLevel === 'first' ? 3600 : accentLevel === 'normal' ? 3200 : 2800;

  const oscillator1 = ctx.createOscillator();
  const oscillator2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  oscillator1.type = 'sawtooth';
  oscillator1.frequency.setValueAtTime(freq1, time);
  oscillator1.frequency.exponentialRampToValueAtTime(freq1 * 0.7, time + 0.02);

  oscillator2.type = 'sawtooth';
  oscillator2.frequency.setValueAtTime(freq2, time);
  oscillator2.frequency.exponentialRampToValueAtTime(freq2 * 0.7, time + 0.02);

  filter.type = 'highpass';
  filter.frequency.value = 1000;
  filter.Q.value = 2;

  gainNode.gain.setValueAtTime(volume, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.04);

  oscillator1.connect(filter);
  oscillator2.connect(filter);
  filter.connect(gainNode);
  out(gainNode);

  oscillator1.start(time);
  oscillator2.start(time);
  oscillator1.stop(time + 0.04);
  oscillator2.stop(time + 0.04);
}

export function playKitBluesOrgan(
  ctx: AudioContext,
  time: number,
  accentLevel: MetronomeAccent,
  out: ConnectKit,
) {
  const volume = 0.9 * ACCENT_MULT[accentLevel];
  const baseFreq = accentLevel === 'first' ? 220 : accentLevel === 'normal' ? 196 : 165;

  const oscillator1 = ctx.createOscillator();
  const oscillator2 = ctx.createOscillator();
  const oscillator3 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  oscillator1.type = 'sawtooth';
  oscillator1.frequency.value = baseFreq;

  oscillator2.type = 'sawtooth';
  oscillator2.frequency.value = baseFreq * 1.25;

  oscillator3.type = 'sawtooth';
  oscillator3.frequency.value = baseFreq * 1.5;

  filter.type = 'lowpass';
  filter.frequency.value = 800;
  filter.Q.value = 2;

  gainNode.gain.setValueAtTime(volume, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

  const gain2 = ctx.createGain();
  gain2.gain.value = 0.7;
  const gain3 = ctx.createGain();
  gain3.gain.value = 0.5;

  oscillator1.connect(filter);
  oscillator2.connect(gain2);
  gain2.connect(filter);
  oscillator3.connect(gain3);
  gain3.connect(filter);
  filter.connect(gainNode);
  out(gainNode);

  oscillator1.start(time);
  oscillator2.start(time);
  oscillator3.start(time);
  oscillator1.stop(time + 0.15);
  oscillator2.stop(time + 0.15);
  oscillator3.stop(time + 0.15);
}

export function playKitRnBFunk(
  ctx: AudioContext,
  time: number,
  accentLevel: MetronomeAccent,
  out: ConnectKit,
) {
  const volume = 1.2 * ACCENT_MULT[accentLevel];
  const freq1 = accentLevel === 'first' ? 110 : accentLevel === 'normal' ? 98 : 82;
  const freq2 = accentLevel === 'first' ? 220 : accentLevel === 'normal' ? 196 : 165;

  const oscillator1 = ctx.createOscillator();
  const oscillator2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  oscillator1.type = 'sawtooth';
  oscillator1.frequency.setValueAtTime(freq1, time);
  oscillator1.frequency.exponentialRampToValueAtTime(freq1 * 1.2, time + 0.01);
  oscillator1.frequency.exponentialRampToValueAtTime(freq1 * 0.8, time + 0.03);

  oscillator2.type = 'sawtooth';
  oscillator2.frequency.value = freq2;

  filter.type = 'bandpass';
  filter.frequency.value = 300;
  filter.Q.value = 4;

  gainNode.gain.setValueAtTime(volume, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

  const gain2 = ctx.createGain();
  gain2.gain.value = 0.8;

  oscillator1.connect(filter);
  oscillator2.connect(gain2);
  gain2.connect(filter);
  filter.connect(gainNode);
  out(gainNode);

  oscillator1.start(time);
  oscillator2.start(time);
  oscillator1.stop(time + 0.08);
  oscillator2.stop(time + 0.08);
}

export function playKitHiphopClap(
  ctx: AudioContext,
  time: number,
  accentLevel: MetronomeAccent,
  out: ConnectKit,
) {
  const volume = 1.3 * ACCENT_MULT[accentLevel];
  const freq1 = accentLevel === 'first' ? 2800 : accentLevel === 'normal' ? 2400 : 2000;
  const freq2 = accentLevel === 'first' ? 3600 : accentLevel === 'normal' ? 3200 : 2800;

  const oscillator1 = ctx.createOscillator();
  const oscillator2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  oscillator1.type = 'square';
  oscillator1.frequency.setValueAtTime(freq1, time);
  oscillator1.frequency.exponentialRampToValueAtTime(freq1 * 0.5, time + 0.02);

  oscillator2.type = 'square';
  oscillator2.frequency.setValueAtTime(freq2, time);
  oscillator2.frequency.exponentialRampToValueAtTime(freq2 * 0.5, time + 0.02);

  filter.type = 'highpass';
  filter.frequency.value = 800;
  filter.Q.value = 3;

  gainNode.gain.setValueAtTime(volume, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.04);

  oscillator1.connect(filter);
  oscillator2.connect(filter);
  filter.connect(gainNode);
  out(gainNode);

  oscillator1.start(time);
  oscillator2.start(time);
  oscillator1.stop(time + 0.04);
  oscillator2.stop(time + 0.04);
}

export function playKitSynthBell(
  ctx: AudioContext,
  time: number,
  accentLevel: MetronomeAccent,
  out: ConnectKit,
) {
  const volume = 0.9 * ACCENT_MULT[accentLevel];
  const baseFreq = accentLevel === 'first' ? 1320 : accentLevel === 'normal' ? 1100 : 660;

  const oscillator1 = ctx.createOscillator();
  const oscillator2 = ctx.createOscillator();
  const oscillator3 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator1.type = 'sine';
  oscillator1.frequency.value = baseFreq;

  oscillator2.type = 'sine';
  oscillator2.frequency.value = baseFreq * 2;

  oscillator3.type = 'sine';
  oscillator3.frequency.value = baseFreq * 3;

  gainNode.gain.setValueAtTime(volume, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

  const gain2 = ctx.createGain();
  gain2.gain.value = 0.5;
  const gain3 = ctx.createGain();
  gain3.gain.value = 0.25;

  oscillator1.connect(gainNode);
  oscillator2.connect(gain2);
  gain2.connect(gainNode);
  oscillator3.connect(gain3);
  gain3.connect(gainNode);
  out(gainNode);

  oscillator1.start(time);
  oscillator2.start(time);
  oscillator3.start(time);
  oscillator1.stop(time + 0.12);
  oscillator2.stop(time + 0.12);
  oscillator3.stop(time + 0.12);
}

export function playKitAnalogBlip(
  ctx: AudioContext,
  time: number,
  accentLevel: MetronomeAccent,
  out: ConnectKit,
) {
  const volume = 1.0 * ACCENT_MULT[accentLevel];
  const startFreq = accentLevel === 'first' ? 660 : accentLevel === 'normal' ? 550 : 440;
  const endFreq = accentLevel === 'first' ? 330 : accentLevel === 'normal' ? 275 : 220;
  const filterFreq = accentLevel === 'first' ? 1800 : accentLevel === 'normal' ? 1500 : 1200;
  const filterEndFreq = accentLevel === 'first' ? 600 : accentLevel === 'normal' ? 500 : 400;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(startFreq, time);
  oscillator.frequency.exponentialRampToValueAtTime(endFreq, time + 0.06);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, time);
  filter.frequency.exponentialRampToValueAtTime(filterEndFreq, time + 0.06);
  filter.Q.value = 4;

  gainNode.gain.setValueAtTime(volume, time);
  gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.06);

  oscillator.connect(filter);
  filter.connect(gainNode);
  out(gainNode);

  oscillator.start(time);
  oscillator.stop(time + 0.06);
}

export function playKitBySoundId(
  sound: MetronomeSound,
  ctx: AudioContext,
  time: number,
  accent: MetronomeAccent,
  out: (soundType: MetronomeSound, node: GainNode) => void,
) {
  const c = (node: GainNode) => out(sound, node);
  switch (sound) {
    case '808-rimshot':
      playKit808Rimshot(ctx, time, accent, c);
      break;
    case 'woodblock':
      playKitWoodblock(ctx, time, accent, c);
      break;
    case 'indian-classical':
      playKitIndianClassical(ctx, time, accent, c);
      break;
    case 'jazz-brush':
      playKitJazzBrush(ctx, time, accent, c);
      break;
    case 'blues-organ':
      playKitBluesOrgan(ctx, time, accent, c);
      break;
    case 'rnb-funk':
      playKitRnBFunk(ctx, time, accent, c);
      break;
    case 'hiphop-clap':
      playKitHiphopClap(ctx, time, accent, c);
      break;
    case 'synth-bell':
      playKitSynthBell(ctx, time, accent, c);
      break;
    case 'analog-blip':
      playKitAnalogBlip(ctx, time, accent, c);
      break;
  }
}
