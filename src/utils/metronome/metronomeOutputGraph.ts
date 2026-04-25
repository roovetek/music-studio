/**
 * Shared metronome output chain (must match {@link MetronomeAudioEngine}).
 *
 * Live path: `playKit` / `patternSynth` **GainNode** → per-path trim(s) → **one** `GainNode` at
 * `METRONOME_MASTER_GAIN` → `AudioDestinationNode`.
 *
 * Calibration: build the same graph with a fresh `AudioContext` / `OfflineAudioContext`.
 */

export const METRONOME_MASTER_GAIN = 0.82;

/** Fixed trim on pattern / groove bus before the shared master. */
export const PATTERN_BUS_TRIM = 0.88;

/**
 * Kit path: source gain → catalog trim → `masterOrNext` (runtime: shared master; offline: a gain set to `METRONOME_MASTER_GAIN` then destination).
 */
export function connectKitThroughTrim(
  ctx: BaseAudioContext,
  sourceGain: GainNode,
  catalogTrimLinear: number,
  masterOrNext: AudioNode,
): void {
  const trim = ctx.createGain();
  trim.gain.value = catalogTrimLinear;
  sourceGain.connect(trim);
  trim.connect(masterOrNext);
}

/**
 * Pattern path: source gain → pattern bus trim (0.88) → shared master (or offline equivalent).
 */
export function connectPatternBus(
  ctx: BaseAudioContext,
  sourceGain: GainNode,
  masterOrNext: AudioNode,
  patternBusTrim: number = PATTERN_BUS_TRIM,
): void {
  const trim = ctx.createGain();
  trim.gain.value = patternBusTrim;
  sourceGain.connect(trim);
  trim.connect(masterOrNext);
}

/**
 * The shared “master” stage used at the end of both kit and pattern paths in calibration renders.
 */
export function createMasterGain(
  ctx: BaseAudioContext,
  destination: AudioNode,
): GainNode {
  const master = ctx.createGain();
  master.gain.value = METRONOME_MASTER_GAIN;
  master.connect(destination);
  return master;
}
