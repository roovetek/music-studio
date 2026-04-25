/**
 * Dev-only: offline-render each kit click (trim=1) and tabla bols (bolGain=1), then print
 * `soundOutputTrim` and `TABLA_BOL_GAIN` so all match Studio Woodblock @ `REF_CATALOG_TRIM`
 * (with -1 dBFS headroom for the chain).
 *
 * Run: `npm run calibrate-metronome`
 */

import { OfflineAudioContext } from 'web-audio-api';
import { type MetronomeSound, soundOptions } from '../src/utils/metronome/catalog.ts';
import { playKitBySoundId } from '../src/utils/metronome/kit.ts';
import { playTablaBolAt, TABLA_BOL_GAIN } from '../src/utils/metronome/patternSynth.ts';
import { createMasterGain, connectKitThroughTrim, connectPatternBus } from '../src/utils/metronome/metronomeOutputGraph.ts';
import {
  CEILING_FULL_SCALE,
  maxAbsSample,
  shortWindowRmsAfterPeak,
} from '../src/utils/metronome/loudnessMetrics.ts';
import type { MetronomeAccent } from '../src/utils/metronome/metronomeAccent.ts';

const SAMPLE_RATE = 48000;
const RENDER_SEC = 0.55;
const REF_SOUND: MetronomeSound = 'woodblock';
const REF_CATALOG_TRIM = 0.78;
const ACCENT: MetronomeAccent = 'normal';

const sounds: MetronomeSound[] = soundOptions.map((o) => o.id);

function newOffline() {
  const n = Math.ceil(SAMPLE_RATE * RENDER_SEC);
  return new OfflineAudioContext(1, n, SAMPLE_RATE);
}

async function renderKit(sound: MetronomeSound, catalogTrim: number): Promise<AudioBuffer> {
  const ctx = newOffline() as import('web-audio-api').OfflineAudioContext;
  const master = createMasterGain(ctx, ctx.destination);
  playKitBySoundId(sound, ctx as never, 0, ACCENT, (_s, gainNode) => {
    connectKitThroughTrim(ctx, gainNode, catalogTrim, master);
  });
  return ctx.startRendering() as Promise<AudioBuffer>;
}

async function renderTabla(bolIndex: number, bolGain: number) {
  const ctx = newOffline() as import('web-audio-api').OfflineAudioContext;
  const master = createMasterGain(ctx, ctx.destination);
  playTablaBolAt(
    ctx as never,
    0,
    bolIndex,
    ACCENT,
    (g) => {
      connectPatternBus(ctx, g, master);
    },
    { bolGain },
  );
  return ctx.startRendering() as Promise<AudioBuffer>;
}

async function main() {
  const peaksAtUnity = new Map<MetronomeSound, number>();
  const rms12 = new Map<MetronomeSound, number>();
  for (const s of sounds) {
    const buf = await renderKit(s, 1.0);
    peaksAtUnity.set(s, maxAbsSample(buf));
    rms12.set(s, shortWindowRmsAfterPeak(buf));
  }

  const mRef = peaksAtUnity.get(REF_SOUND)!;
  const target = mRef * REF_CATALOG_TRIM;

  const rawTrims = new Map<MetronomeSound, number>();
  for (const s of sounds) {
    const m = peaksAtUnity.get(s)!;
    rawTrims.set(s, m > 0 ? target / m : 1);
  }

  let maxOut = 0;
  for (const s of sounds) {
    maxOut = Math.max(maxOut, peaksAtUnity.get(s)! * (rawTrims.get(s) ?? 0));
  }
  const ceilingMul = maxOut > CEILING_FULL_SCALE ? CEILING_FULL_SCALE / maxOut : 1;
  const targetCapped = target * ceilingMul;

  /** Web Audio allows gain >1; we cap so one odd polyfill outlier does not require huge headroom. */
  const TRIM_CAP = 1.2;
  const finalTrims = new Map<MetronomeSound, number>();
  for (const s of sounds) {
    finalTrims.set(
      s,
      Math.min(TRIM_CAP, (rawTrims.get(s) ?? 0) * ceilingMul),
    );
  }

  const tablaBuf = await renderTabla(0, 1.0);
  const peakTab = maxAbsSample(tablaBuf);
  const TABLA_GAIN_CAP = 6.5;
  const newTablaGain = Math.min(
    TABLA_GAIN_CAP,
    peakTab > 0 ? targetCapped / peakTab : TABLA_BOL_GAIN,
  );

  console.log('// — Metronome level calibration (peak-matched, -1 dBFS ceiling) —');
  console.log(`// Per-sound peak @ catalogTrim=1, master=${'see metronomeOutputGraph METRONOME_MASTER_GAIN'}, accent=${ACCENT}`);
  for (const s of sounds) {
    console.log(
      `//   ${s}: peak ${peaksAtUnity.get(s)!.toFixed(6)}  rms12 ${rms12.get(s)!.toFixed(6)}`,
    );
  }
  console.log(
    `// ${REF_SOUND} * ${REF_CATALOG_TRIM} => target = ${target.toFixed(6)}; after ceiling: ${targetCapped.toFixed(6)} (mul ${ceilingMul.toFixed(4)})`,
  );
  console.log(`// Tabla (bol index 0, ta) @ bolGain=1: peak ${peakTab.toFixed(6)}`);
  console.log('');
  console.log('export const soundOutputTrim: Record<MetronomeSound, number> = {');
  for (const s of sounds) {
    console.log(`  '${s}': ${(finalTrims.get(s) ?? 0).toFixed(3)},`);
  }
  console.log('};');
  console.log('');
  console.log(
    `// Set TABLA_BOL_GAIN in patternSynth to ${newTablaGain.toFixed(3)} (current ${TABLA_BOL_GAIN})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
