/**
 * Public entry for metronome audio: catalog + single engine instance.
 * Implementation is split under `./metronome/` (see docs/metronome.md).
 */
export type { MetronomeSound, SoundGroup, InstrumentFamily, SoundOption } from './metronome/catalog';
export { soundGroupOrder, soundOptions } from './metronome/catalog';
export { metronomeAudio } from './metronome/metronomeEngine';
