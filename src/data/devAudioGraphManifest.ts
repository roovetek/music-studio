import type { MetronomeSound } from '../utils/metronome/catalog';
import { METRONOME_MASTER_GAIN, PATTERN_BUS_TRIM } from '../utils/metronome/metronomeOutputGraph';

/**
 * Human-readable map of what each `playKit*` voice builds. Source of truth for DSP is still
 * `src/utils/metronome/kit.ts` — this is for the dev / lab UI only.
 */
export const kitGraphSummaries: Record<MetronomeSound, { summary: string; graph: string[] }> = {
  '808-rimshot': {
    summary: 'Sine, rapid pitch down-sweep, short decay (electronic snap).',
    graph: [
      'Oscillator (sine) → freq exp ramp',
      'BiquadFilter (highpass 800 Hz, Q 2) →',
      'Gain (decay 80 ms) → out',
    ],
  },
  woodblock: {
    summary: 'Two detuned square harmonics, band-limited, very short (reference timbre for calibration).',
    graph: [
      'Osc1 (square) + Osc2 (square) →',
      'BiquadFilter (bandpass 1600 Hz, Q 5) →',
      'Gain (decay 40 ms) → out',
    ],
  },
  'indian-classical': {
    summary: 'Two triangle partials, one via trim 0.6, bandpass body (tabla-style kit click).',
    graph: [
      'Osc1 (tri) + Osc2 (tri) via Gain(0.6) →',
      'BiquadFilter (bandpass) →',
      'Gain (decay) → out',
    ],
  },
  'jazz-brush': {
    summary: 'Two saws, down-sweep, highpass; short soft tick (brush wash).',
    graph: [
      'Osc1 + Osc2 (saw) into BiquadFilter (highpass 1 kHz, Q 2)',
      'Gain (40 ms) to out',
    ],
  },
  'blues-organ': {
    summary: 'Three detuned saws, single lowpass; chordal organ bump.',
    graph: [
      'Osc1 (direct) + Osc2 (0.7) + Osc3 (0.5) to BiquadFilter (lowpass 800 Hz)',
      'Gain (150 ms) to out',
    ],
  },
  'rnb-funk': {
    summary: 'Low saw + formant, bandpass 300 Hz; bassy thump.',
    graph: [
      'Osc1 (saw, wobble) + Osc2 (saw) via Gain(0.8) to BiquadFilter (bandpass 300 Hz)',
      'Gain (80 ms) to out',
    ],
  },
  'hiphop-clap': {
    summary: 'Two squares, down-sweep, highpass 800; tight clap.',
    graph: [
      'Osc1 + Osc2 (square) to BiquadFilter (highpass 800 Hz)',
      'Gain (40 ms) to out',
    ],
  },
  'synth-bell': {
    summary: 'Three sines 1:2:3 with gains 1 / 0.5 / 0.25; additive bell, no biquad.',
    graph: [
      'Osc1 + Osc2 + Osc3 to single Gain (120 ms)',
    ],
  },
  'analog-blip': {
    summary: 'Saw + sweeping lowpass, short retro beep.',
    graph: [
      'Osc (saw) + BiquadFilter (lowpass, moving cutoff)',
      '→ Gain (60 ms) → out',
    ],
  },
};

export const OUTPUT_BUS_SCHEMATIC = [
  `┌─ Kit path ───────────────────────────────────────┐`,
  `│  per-voice: … → [source GainNode] (envelope)     │`,
  `│       → |catalogTrim| (per sound)                │`,
  `│       → |METRONOME_MASTER_GAIN ${METRONOME_MASTER_GAIN}|  ← shared master  │`,
  `│       → destination (or Analyser in this lab)     │`,
  `└──────────────────────────────────────────────────┘`,
  `┌─ Pattern / groove bus (tabla, piano, etc.) ──────┐`,
  `│  … → |PATTERN_BUS_TRIM ${PATTERN_BUS_TRIM}|        │`,
  `│     → same master node                            │`,
  `└──────────────────────────────────────────────────┘`,
].join('\n');

export const LOUDNESS_NOTES = {
  calScript:
    'npm run calibrate-metronome uses OfflineAudioContext: sample peak and a 12 ms RMS around the peak sample. No FFT; time-domain only.',
  lufs: 'EBU/ITU integrated loudness (LUFS) weight program material over time; 40–200 ms clicks are poor fit. This app matches digital peak + optional short RMS for sanity.',
  analyser:
    'AnalyserNode uses an FFT to fill frequencyData / time domain arrays — good for a live spectrum, not a broadcast LUFS meter without K-weighting and gating as in ITU-R BS.1770.',
} as const;
