/**
 * Shared accent / velocity model for the metronome: one place to tune how
 * downbeats, backbeats, and subdivisions read relative to each other.
 */

export type MetronomeAccent = 'none' | 'normal' | 'first';

/** Linear gain multipliers: unaccented beats vs accented vs bar-1. */
export const ACCENT_MULT: Record<MetronomeAccent, number> = {
  none: 0.45,
  normal: 1,
  first: 1.36,
};

/** Slight stretch/shrink of note length (pro metronome “velocity” feel). */
export const ACCENT_DURATION: Record<MetronomeAccent, number> = {
  none: 0.92,
  normal: 1,
  first: 1.05,
};

/** Brighter = slightly higher formant or filter focus (0.94–1.08 range). */
export const ACCENT_BRIGHT: Record<MetronomeAccent, number> = {
  none: 0.95,
  normal: 1,
  first: 1.07,
};

/**
 * How much to tuck subdivision syllables (e.g. 16th “ka / di / mi”) under beat attacks.
 * Applied in addition to ACCENT (subdivisions are usually `none`).
 */
export const SUBDIVISION_GAIN_VS_BEAT = 0.56;

/**
 * Spoken 1-2-3-4 count-in: Web Speech is very loud at 1.0; this aligns perceived level
 * with synthesized metronome cues and playback.
 */
export const VOICE_COUNT_IN_UTTERANCE_VOLUME = 0.55;

/**
 * @param step — linear index within the bar (0 .. totalStepsInBar-1)
 * @param stepsPerBeat — e.g. 4 for 16th notes in 4/4
 * @param accentedBeats — which beat indices 0..beatsPerBar-1 get a stressed attack
 * @param beatsPerBar — used to verify bar downbeat; step reset means beatIndex 0 is bar-1
 */
export function getMetronomeAccentForStep(
  step: number,
  stepsPerBeat: number,
  beatsPerBar: number,
  accentedBeats: readonly number[],
): MetronomeAccent {
  const subdivisionIndex = step % stepsPerBeat;
  const beatIndex = Math.floor(step / stepsPerBeat) % beatsPerBar;

  if (subdivisionIndex === 0 && beatIndex === 0) {
    return 'first';
  }
  if (subdivisionIndex === 0 && accentedBeats.includes(beatIndex)) {
    return 'normal';
  }
  return 'none';
}
