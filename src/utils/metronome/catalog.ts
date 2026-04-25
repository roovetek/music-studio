export type MetronomeSound =
  | '808-rimshot'
  | 'woodblock'
  | 'indian-classical'
  | 'jazz-brush'
  | 'blues-organ'
  | 'rnb-funk'
  | 'hiphop-clap'
  | 'synth-bell'
  | 'analog-blip';

export type SoundGroup = 'Core Practice' | 'Acoustic / World' | 'Color / Genre';

export type InstrumentFamily =
  | 'Percussion'
  | 'World'
  | 'Drums'
  | 'Keys'
  | 'Bass'
  | 'Electronic';

export interface SoundOption {
  id: MetronomeSound;
  name: string;
  description: string;
  mood: string;
  group: SoundGroup;
  /** Grouping for instrument-focused filters and future features */
  instrumentFamily: InstrumentFamily;
  tags: string[];
  recommended?: boolean;
}

export const soundGroupOrder: SoundGroup[] = [
  'Core Practice',
  'Acoustic / World',
  'Color / Genre',
];

export const soundOptions: SoundOption[] = [
  {
    id: 'woodblock',
    name: 'Studio Woodblock',
    description: 'Clear, steady click for daily practice',
    mood: 'Acoustic / Neutral',
    group: 'Core Practice',
    instrumentFamily: 'Percussion',
    tags: ['woodblock', 'clear', 'practice', 'neutral', 'acoustic'],
    recommended: true,
  },
  {
    id: '808-rimshot',
    name: '808 Rimshot',
    description: 'Tight electronic snap with strong attack',
    mood: 'Electronic / Precise',
    group: 'Core Practice',
    instrumentFamily: 'Percussion',
    tags: ['808', 'rimshot', 'electronic', 'precise', 'bright'],
  },
  {
    id: 'synth-bell',
    name: 'Synth Bell',
    description: 'Bright chime that makes the pulse easy to follow',
    mood: 'Melodic / Clear',
    group: 'Core Practice',
    instrumentFamily: 'Electronic',
    tags: ['bell', 'bright', 'clear', 'practice', 'melodic'],
  },
  {
    id: 'indian-classical',
    name: 'Tabla Bols',
    description: 'Tabla-inspired pulse for tala-focused practice',
    mood: 'Indian Classical',
    group: 'Acoustic / World',
    instrumentFamily: 'World',
    tags: ['tabla', 'bols', 'indian', 'classical', 'tala', 'riyaz'],
  },
  {
    id: 'jazz-brush',
    name: 'Jazz Brush',
    description: 'Soft brushed attack for relaxed swing practice',
    mood: 'Jazz / Swing',
    group: 'Acoustic / World',
    instrumentFamily: 'Drums',
    tags: ['jazz', 'brush', 'swing', 'soft', 'acoustic'],
  },
  {
    id: 'blues-organ',
    name: 'Blues Organ',
    description: 'Warm chord-like pulse with a rounded attack',
    mood: 'Blues / Soul',
    group: 'Acoustic / World',
    instrumentFamily: 'Keys',
    tags: ['organ', 'blues', 'soul', 'warm', 'rounded'],
  },
  {
    id: 'rnb-funk',
    name: 'R&B Funk',
    description: 'Low-end rhythmic hit with a groovy feel',
    mood: 'R&B / Funk',
    group: 'Color / Genre',
    instrumentFamily: 'Bass',
    tags: ['rnb', 'funk', 'groove', 'bass', 'modern'],
  },
  {
    id: 'hiphop-clap',
    name: 'Hip-Hop Clap',
    description: 'Crisp clap sound with a sharp transient',
    mood: 'Hip-Hop / Trap',
    group: 'Color / Genre',
    instrumentFamily: 'Percussion',
    tags: ['clap', 'hip-hop', 'trap', 'sharp', 'modern'],
  },
  {
    id: 'analog-blip',
    name: 'Analog Blip',
    description: 'Retro synth pulse for a lighter electronic texture',
    mood: 'Retro / Lo-Fi',
    group: 'Color / Genre',
    instrumentFamily: 'Electronic',
    tags: ['analog', 'blip', 'retro', 'lo-fi', 'electronic'],
  },
];

/**
 * Per-click trim after the kit synth, before the shared `METRONOME_MASTER_GAIN` in
 * `metronomeOutputGraph` / `metronomeEngine` (roughly: peak-match to Studio Woodblock @ 0.78,
 * -1 dBFS headroom, trim cap 1.2). Recompute with `npm run calibrate-metronome` (Node
 * `web-audio-api` is approximate; spot-check in the browser if a sound is off).
 */
export const soundOutputTrim: Record<MetronomeSound, number> = {
  'woodblock': 0.78,
  '808-rimshot': 0.59,
  'synth-bell': 0.734,
  'indian-classical': 1.2,
  'jazz-brush': 0.478,
  'blues-organ': 0.64,
  'rnb-funk': 1.2,
  'hiphop-clap': 0.238,
  'analog-blip': 0.717,
};
