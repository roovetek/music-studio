import type { StrumToken } from '../../data/guitarStrumPatterns';
import {
  ACCENT_BRIGHT,
  ACCENT_DURATION,
  ACCENT_MULT,
  SUBDIVISION_GAIN_VS_BEAT,
  type MetronomeAccent,
} from '../metronomeAccent';
import { soundOutputTrim, type MetronomeSound } from './catalog';
import { playKitBySoundId } from './kit';
import {
  playDrumPatternStepAt as patternDrumStep,
  playGuitarStrumTokenAt as patternGuitarStrumToken,
  playPianoNoteAt as patternPianoNote,
  playReggaeOneDropTokenAt as patternReggaeOneDrop,
  playSkaChankTokenAt as patternSkaChank,
  playBossaNylonTokenAt as patternBossaNylon,
  playSalsaMontunoPianoTokenAt as patternSalsaMontuno,
  playSambaPartidoTokenAt as patternSambaPartido,
  playTablaBolAt as patternTablaBol,
  playViolinBowAt as patternViolinBow,
} from './patternSynth';

class MetronomeAudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  /** Decaying white noise buffers keyed by length in samples (reused to avoid per-hit allocation). */
  private noiseBufferByLength = new Map<number, AudioBuffer>();

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const Ctor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        throw new Error('Web Audio API is not supported');
      }
      this.audioContext = new Ctor();
    }
    return this.audioContext;
  }

  getContext(): AudioContext {
    return this.getAudioContext();
  }

  peekContext(): AudioContext | null {
    return this.audioContext;
  }

  private getMasterGain(ctx: AudioContext): GainNode {
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = 0.82;
      this.masterGain.connect(ctx.destination);
    }

    return this.masterGain;
  }

  private getDecayingNoiseBuffer(ctx: AudioContext, lengthSeconds: number): AudioBuffer {
    const length = Math.max(1, Math.floor(ctx.sampleRate * lengthSeconds));
    let buffer = this.noiseBufferByLength.get(length);
    if (!buffer) {
      buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const d = buffer.getChannelData(0);
      for (let i = 0; i < d.length; i += 1) {
        d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      }
      this.noiseBufferByLength.set(length, buffer);
    }
    return buffer;
  }

  private connectOutput(ctx: AudioContext, gainNode: GainNode, soundType: MetronomeSound) {
    const outputTrim = ctx.createGain();
    outputTrim.gain.value = soundOutputTrim[soundType];
    gainNode.connect(outputTrim);
    outputTrim.connect(this.getMasterGain(ctx));
  }

  private connectPatternOutput(ctx: AudioContext, gainNode: GainNode) {
    const trim = ctx.createGain();
    trim.gain.value = 0.88;
    gainNode.connect(trim);
    trim.connect(this.getMasterGain(ctx));
  }

  playCountInCueAt(index: number, time: number) {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const cueTrim = ctx.createGain();
    const baseFrequencies = [740, 620, 660, 780, 700, 820];
    const frequency = baseFrequencies[index % baseFrequencies.length];

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.78, time + 0.11);

    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(frequency * 1.5, time);
    overtone.frequency.exponentialRampToValueAtTime(frequency, time + 0.08);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, time);
    filter.Q.value = 2.6;

    /** Match a typical "normal" woodblock click (kit gain × per-sound trim). */
    const targetPeak = ACCENT_MULT.normal * soundOutputTrim.woodblock;
    const firstBoost = 1.08;
    const otherScale = 0.88;
    const peak = index === 0 ? targetPeak * firstBoost : targetPeak * otherScale;
    gainNode.gain.setValueAtTime(peak, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.16);

    cueTrim.gain.value = 1;

    oscillator.connect(filter);
    overtone.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(cueTrim);
    cueTrim.connect(this.getMasterGain(ctx));

    oscillator.start(time);
    overtone.start(time);
    oscillator.stop(time + 0.16);
    overtone.stop(time + 0.14);
  }

  playVocalBeatAt(time: number, accentLevel: MetronomeAccent = 'none') {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const formantA = ctx.createBiquadFilter();
    const formantB = ctx.createBiquadFilter();
    const trimNode = ctx.createGain();
    const b = ACCENT_BRIGHT[accentLevel];
    const baseFrequency =
      accentLevel === 'first' ? 210 : accentLevel === 'normal' ? 235 : 280;
    const duration =
      (accentLevel === 'none' ? 0.09 : 0.12) * ACCENT_DURATION[accentLevel];

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(baseFrequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(baseFrequency * 0.82, time + duration);

    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(baseFrequency * 2, time);
    overtone.frequency.exponentialRampToValueAtTime(
      baseFrequency * 1.35,
      time + duration * 0.75,
    );

    formantA.type = 'bandpass';
    formantA.frequency.setValueAtTime((accentLevel === 'none' ? 1100 : 860) * b, time);
    formantA.Q.value = 3.2;

    formantB.type = 'bandpass';
    formantB.frequency.setValueAtTime((accentLevel === 'none' ? 1850 : 1450) * b, time);
    formantB.Q.value = 2.4;

    gainNode.gain.setValueAtTime(
      accentLevel === 'first' ? 0.24 : accentLevel === 'normal' ? 0.18 : 0.12,
      time,
    );
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);

    trimNode.gain.value = accentLevel === 'none' ? 0.96 : 1.04;

    oscillator.connect(formantA);
    overtone.connect(formantB);
    formantA.connect(gainNode);
    formantB.connect(gainNode);
    gainNode.connect(trimNode);
    trimNode.connect(this.getMasterGain(ctx));

    oscillator.start(time);
    overtone.start(time);
    oscillator.stop(time + duration);
    overtone.stop(time + duration * 0.95);
  }

  playSyllableBeatAt(
    time: number,
    accentLevel: MetronomeAccent = 'none',
    subdivisionIndex = 0,
    stepsPerBeat = 1,
  ) {
    const ctx = this.getAudioContext();
    const voiceOscillator = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const consonantSource = ctx.createBufferSource();
    const voiceGain = ctx.createGain();
    const consonantGain = ctx.createGain();
    const consonantFilter = ctx.createBiquadFilter();
    const mixGain = ctx.createGain();
    const formantA = ctx.createBiquadFilter();
    const formantB = ctx.createBiquadFilter();
    const trimNode = ctx.createGain();
    const isSubdivision = subdivisionIndex !== 0;
    const subMul = isSubdivision ? SUBDIVISION_GAIN_VS_BEAT : 1;
    const beatOnlyGain = isSubdivision ? 1 : ACCENT_MULT[accentLevel];
    const formantBright = isSubdivision ? 1 : ACCENT_BRIGHT[accentLevel];
    const sixteenthCycle = ['ta', 'ka', 'di', 'mi'] as const;
    const eighthCycle = ['ta', 'ka'] as const;
    const subdivisionCycle = stepsPerBeat >= 4 ? sixteenthCycle : eighthCycle;
    const syllableVariant = isSubdivision
      ? subdivisionCycle[subdivisionIndex % subdivisionCycle.length]
      : accentLevel === 'first'
        ? 'one'
        : 'ta';
    const syllableProfile = syllableVariant === 'one'
      ? {
          baseFrequency: 172,
          overtoneFrequency: 315,
          duration: 0.19,
          formantA: 540,
          formantB: 920,
          voicePeak: 0.27,
          consonantPeak: 0.065,
          attackDelay: 0.018,
          consonantDuration: 0.018,
          consonantCutoff: 700,
          consonantQ: 0.75,
          trim: 1.12,
          oscillatorType: 'sawtooth' as OscillatorType,
        }
      : syllableVariant === 'ka'
        ? {
            baseFrequency: 292,
            overtoneFrequency: 505,
            duration: 0.078,
            formantA: 1280,
            formantB: 2140,
            voicePeak: 0.1,
            consonantPeak: 0.16,
            attackDelay: 0.01,
            consonantDuration: 0.021,
            consonantCutoff: 1680,
            consonantQ: 2.3,
            trim: 0.95,
            oscillatorType: 'triangle' as OscillatorType,
          }
        : syllableVariant === 'di'
          ? {
              baseFrequency: 272,
              overtoneFrequency: 470,
              duration: 0.078,
              formantA: 1560,
              formantB: 2260,
              voicePeak: 0.095,
              consonantPeak: 0.1,
              attackDelay: 0.007,
              consonantDuration: 0.019,
              consonantCutoff: 1760,
              consonantQ: 2.5,
              trim: 0.91,
              oscillatorType: 'triangle' as OscillatorType,
            }
          : syllableVariant === 'mi'
            ? {
                baseFrequency: 258,
                overtoneFrequency: 455,
                duration: 0.084,
                formantA: 1040,
                formantB: 1840,
                voicePeak: 0.1,
                consonantPeak: 0.055,
                attackDelay: 0.007,
                consonantDuration: 0.016,
                consonantCutoff: 1320,
                consonantQ: 1.5,
                trim: 0.93,
                oscillatorType: 'triangle' as OscillatorType,
              }
        : {
            baseFrequency: accentLevel === 'normal' ? 228 : 248,
            overtoneFrequency: accentLevel === 'normal' ? 440 : 490,
            duration: accentLevel === 'normal' ? 0.12 : 0.09,
            formantA: accentLevel === 'normal' ? 920 : 1080,
            formantB: accentLevel === 'normal' ? 1580 : 1820,
            voicePeak: accentLevel === 'normal' ? 0.18 : 0.13,
            consonantPeak: accentLevel === 'normal' ? 0.15 : 0.18,
            attackDelay: 0.006,
            consonantDuration: 0.028,
            consonantCutoff: accentLevel === 'normal' ? 1500 : 1750,
            consonantQ: 2.1,
            trim: accentLevel === 'normal' ? 1.01 : 0.95,
            oscillatorType: 'sawtooth' as OscillatorType,
          };

    voiceOscillator.type = syllableProfile.oscillatorType;
    voiceOscillator.frequency.setValueAtTime(syllableProfile.baseFrequency, time);
    voiceOscillator.frequency.exponentialRampToValueAtTime(
      syllableProfile.baseFrequency * 0.8,
      time + syllableProfile.duration,
    );

    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(syllableProfile.overtoneFrequency, time);
    overtone.frequency.exponentialRampToValueAtTime(
      syllableProfile.overtoneFrequency * 0.88,
      time + syllableProfile.duration * 0.85,
    );

    consonantSource.buffer = this.getDecayingNoiseBuffer(ctx, 0.035);

    consonantFilter.type = syllableVariant === 'one' ? 'lowpass' : 'bandpass';
    consonantFilter.frequency.setValueAtTime(syllableProfile.consonantCutoff, time);
    consonantFilter.Q.value = syllableProfile.consonantQ;

    formantA.type = 'bandpass';
    formantA.frequency.setValueAtTime(syllableProfile.formantA * formantBright, time);
    formantA.Q.value = syllableVariant === 'ka'
      ? 3.5
      : syllableVariant === 'di'
        ? 3.8
        : syllableVariant === 'mi'
          ? 2.2
          : syllableVariant === 'one'
            ? 2.1
            : 2.8;

    formantB.type = 'bandpass';
    formantB.frequency.setValueAtTime(syllableProfile.formantB * formantBright, time);
    formantB.Q.value = syllableVariant === 'ka'
      ? 2.7
      : syllableVariant === 'di'
        ? 3.1
        : syllableVariant === 'mi'
          ? 1.9
          : syllableVariant === 'one'
            ? 1.7
            : 2.2;

    voiceGain.gain.setValueAtTime(0.001, time);
    voiceGain.gain.linearRampToValueAtTime(
      syllableProfile.voicePeak * beatOnlyGain,
      time + syllableProfile.attackDelay,
    );
    voiceGain.gain.exponentialRampToValueAtTime(
      0.01,
      time + syllableProfile.duration * (isSubdivision ? 1 : ACCENT_DURATION[accentLevel]),
    );

    consonantGain.gain.setValueAtTime(syllableProfile.consonantPeak * beatOnlyGain, time);
    consonantGain.gain.exponentialRampToValueAtTime(
      0.01,
      time + syllableProfile.consonantDuration,
    );

    mixGain.gain.value = subMul;
    trimNode.gain.value = syllableProfile.trim;

    voiceOscillator.connect(formantA);
    overtone.connect(formantB);
    consonantSource.connect(consonantFilter);
    consonantFilter.connect(consonantGain);
    formantA.connect(voiceGain);
    formantB.connect(voiceGain);
    voiceGain.connect(mixGain);
    consonantGain.connect(mixGain);
    mixGain.connect(trimNode);
    trimNode.connect(this.getMasterGain(ctx));

    voiceOscillator.start(time);
    overtone.start(time);
    consonantSource.start(time);

    voiceOscillator.stop(time + syllableProfile.duration);
    overtone.stop(time + syllableProfile.duration * 0.92);
    consonantSource.stop(time + syllableProfile.consonantDuration);
  }

  async resume() {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    return ctx;
  }

  playTablaBolAt(
    time: number,
    bolIndex: number,
    accentLevel: MetronomeAccent = 'none',
  ) {
    const ctx = this.getAudioContext();
    patternTablaBol(ctx, time, bolIndex, accentLevel, (g) => this.connectPatternOutput(ctx, g));
  }

  playGuitarStrumStepAt(
    time: number,
    token: StrumToken,
    accentLevel: MetronomeAccent = 'none',
  ) {
    const ctx = this.getAudioContext();
    patternGuitarStrumToken(ctx, time, token, accentLevel, (g) =>
      this.connectPatternOutput(ctx, g),
    );
  }

  playReggaeOneDropStepAt(
    time: number,
    token: StrumToken,
    accentLevel: MetronomeAccent = 'none',
  ) {
    const ctx = this.getAudioContext();
    patternReggaeOneDrop(ctx, time, token, accentLevel, (g) => this.connectPatternOutput(ctx, g));
  }

  playSkaChankStepAt(
    time: number,
    token: StrumToken,
    accentLevel: MetronomeAccent = 'none',
  ) {
    const ctx = this.getAudioContext();
    patternSkaChank(ctx, time, token, accentLevel, (g) => this.connectPatternOutput(ctx, g));
  }

  playBossaNylonStepAt(
    time: number,
    token: StrumToken,
    accentLevel: MetronomeAccent = 'none',
  ) {
    const ctx = this.getAudioContext();
    patternBossaNylon(ctx, time, token, accentLevel, (g) => this.connectPatternOutput(ctx, g));
  }

  playSalsaMontunoPianoStepAt(
    time: number,
    token: StrumToken,
    accentLevel: MetronomeAccent = 'none',
  ) {
    const ctx = this.getAudioContext();
    patternSalsaMontuno(ctx, time, token, accentLevel, (g) => this.connectPatternOutput(ctx, g));
  }

  playSambaPartidoStepAt(
    time: number,
    token: StrumToken,
    accentLevel: MetronomeAccent = 'none',
  ) {
    const ctx = this.getAudioContext();
    patternSambaPartido(ctx, time, token, accentLevel, (g) => this.connectPatternOutput(ctx, g));
  }

  playPianoNoteAt(
    time: number,
    scaleDegree: number,
    accentLevel: MetronomeAccent = 'none',
  ) {
    const ctx = this.getAudioContext();
    patternPianoNote(ctx, time, scaleDegree, accentLevel, (g) =>
      this.connectPatternOutput(ctx, g),
    );
  }

  playViolinBowAt(
    time: number,
    accentLevel: MetronomeAccent = 'none',
    stepDurationSec = 0.3,
  ) {
    const ctx = this.getAudioContext();
    patternViolinBow(ctx, time, accentLevel, stepDurationSec, (g) =>
      this.connectPatternOutput(ctx, g),
    );
  }

  playDrumPatternStepAt(
    time: number,
    grid16: number,
    accentLevel: MetronomeAccent = 'none',
  ) {
    const ctx = this.getAudioContext();
    patternDrumStep(
      ctx,
      time,
      grid16,
      accentLevel,
      (c, s) => this.getDecayingNoiseBuffer(c, s),
      (g) => this.connectPatternOutput(ctx, g),
    );
  }

  playSoundAt(
    soundType: MetronomeSound,
    time: number,
    accentLevel: MetronomeAccent = 'none',
  ) {
    const ctx = this.getAudioContext();
    playKitBySoundId(soundType, ctx, time, accentLevel, (s, n) => this.connectOutput(ctx, n, s));
  }

  playSound(soundType: MetronomeSound, accentLevel: MetronomeAccent = 'none') {
    const ctx = this.getAudioContext();
    this.playSoundAt(soundType, ctx.currentTime, accentLevel);
  }
}

export const metronomeAudio = new MetronomeAudioEngine();
