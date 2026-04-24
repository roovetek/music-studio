/**
 * Classic strum patterns for 4/4 (8th-note grid) and 3/4 waltz.
 * D = down, U = up, G = ghost (hand moves, no/little string energy), R = rest (silence).
 * Mapped onto the current bar: step index scales to `steps.length` (see getGuitarPatternCellIndex).
 */

export type StrumToken = 'D' | 'U' | 'G' | 'R';

export type GuitarStrumPatternId =
  | 'old-faithful'
  | 'ballad-eights'
  | 'rock-driver'
  | 'folk-shuffle'
  | 'waltz-34'
  | 'reggae-offbeat'
  | 'ska-chank'
  | 'bossa-nova-8'
  | 'montuno-8'
  | 'partido-samba-8';

export type GuitarStrumFeelId =
  | 'pop-folk'
  | 'ballad'
  | 'rock'
  | 'folk'
  | 'waltz'
  | 'reggae'
  | 'latin';

export interface GuitarStrumPatternDef {
  id: GuitarStrumPatternId;
  feelId: GuitarStrumFeelId;
  name: string;
  /** e.g. D=Down, U=Up, · = ghost */
  notation: string;
  bestFor: string;
  /** One full bar: 8 cells for 4/4 eighths, or 6 for 3/4 waltz (six eighths) */
  steps: StrumToken[];
}

export const GUITAR_STRUM_PATTERNS: GuitarStrumPatternDef[] = [
  {
    id: 'old-faithful',
    feelId: 'pop-folk',
    name: 'The "Old Faithful"',
    notation: 'D D U U D U (then rest or repeat in next bar as needed)',
    bestFor: 'The most common pattern in pop / folk. Pair with 4/4 eighth or sixteenth meters.',
    steps: ['D', 'D', 'U', 'U', 'D', 'U', 'R', 'R'],
  },
  {
    id: 'ballad-eights',
    feelId: 'ballad',
    name: 'The Ballad',
    notation: 'D D D D D D D D',
    bestFor: 'Steady eighths for slow songs; even pulse under vocals.',
    steps: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'],
  },
  {
    id: 'rock-driver',
    feelId: 'rock',
    name: 'The Rock Driver',
    notation: 'D D D U D D D U',
    bestFor: 'Driving feel with a slight accent on the back side of 4 in many arrangements.',
    steps: ['D', 'D', 'D', 'U', 'D', 'D', 'D', 'U'],
  },
  {
    id: 'folk-shuffle',
    feelId: 'folk',
    name: 'The Folk Shuffle',
    notation: 'D · D U D · D U  (dot = ghost miss)',
    bestFor: 'Boom-chick and swingy folk; ghosts keep the hand moving without full chords.',
    steps: ['D', 'G', 'D', 'U', 'D', 'G', 'D', 'U'],
  },
  {
    id: 'waltz-34',
    feelId: 'waltz',
    name: 'The Waltz (3/4)',
    notation: 'D D U D U + rest',
    bestFor: 'Classic 1 — 2 — 3; use 3/4 or 6/8 style meters. Six eighth-note slots in the bar.',
    steps: ['D', 'D', 'U', 'D', 'U', 'R'],
  },
  {
    id: 'reggae-offbeat',
    feelId: 'reggae',
    name: 'Reggae (one drop)',
    notation: 'R R D R R R D R  (wires on 2 and 4)',
    bestFor: 'One-drop: chords on backbeats. Pair with 4/4 (eighth or sixteenth) meters.',
    steps: ['R', 'R', 'D', 'R', 'R', 'R', 'D', 'R'],
  },
  {
    id: 'ska-chank',
    feelId: 'reggae',
    name: 'Ska chank / up-chop',
    notation: 'R R U R R R U R',
    bestFor: 'Offbeat upstrokes; light chank between. Works in 4/4.',
    steps: ['R', 'R', 'U', 'R', 'R', 'R', 'U', 'R'],
  },
  {
    id: 'bossa-nova-8',
    feelId: 'latin',
    name: 'Bossa (8th)',
    notation: 'D R D D R U D R',
    bestFor: 'Bossa-nova and MPB; syncopation between thumb and strum. 4/4 eight-note grid.',
    steps: ['D', 'R', 'D', 'D', 'R', 'U', 'D', 'R'],
  },
  {
    id: 'montuno-8',
    feelId: 'latin',
    name: 'Salsa / montuno (8th)',
    notation: 'D R D U D R D U',
    bestFor: 'Piano and guitar guajeos; lock with clave. 4/4 bar.',
    steps: ['D', 'R', 'D', 'U', 'D', 'R', 'D', 'U'],
  },
  {
    id: 'partido-samba-8',
    feelId: 'latin',
    name: 'Partido alto (8th)',
    notation: 'D G D U D D U D  (ghosts and lighter 3–4 side)',
    bestFor: 'Samba and pagode; “telecoteco”-style phrasing on an eighth grid. 4/4.',
    steps: ['D', 'G', 'D', 'U', 'D', 'D', 'U', 'D'],
  },
];

export const GUITAR_STRUM_FEELS: { id: GuitarStrumFeelId; label: string; hint: string }[] = [
  { id: 'pop-folk', label: 'Pop / Folk', hint: 'Steady strums and the familiar D-D-U feel.' },
  { id: 'ballad', label: 'Ballad', hint: 'Even eighths, room for lyrics and long lines.' },
  { id: 'rock', label: 'Rock', hint: 'Palm-friendly drivers and backbeat energy.' },
  { id: 'folk', label: 'Folk / Shuffle', hint: 'Ghosts and misses for a lighter, swinging pocket.' },
  { id: 'waltz', label: '3/4 Waltz', hint: 'One strong down per measure group; triple feel.' },
  { id: 'reggae', label: 'Reggae / Caribbean', hint: 'One-drop and offbeat chanks, rests as important as hits.' },
  { id: 'latin', label: 'Latin', hint: 'Bossa, tumbao, and samba strum cells on the eight-note grid.' },
];

const patternById = new Map(
  GUITAR_STRUM_PATTERNS.map((p) => [p.id, p] as const),
);

export function getGuitarStrumPattern(id: GuitarStrumPatternId): GuitarStrumPatternDef {
  return patternById.get(id) ?? GUITAR_STRUM_PATTERNS[0]!;
}

/**
 * Map linear metronome `step` into a pattern cell so the full pattern fits one bar
 * of `totalBeats` steps (any subdivision count).
 */
export function getGuitarPatternCellIndex(step: number, totalBeats: number, patternLength: number): number {
  if (totalBeats <= 0 || patternLength <= 0) {
    return 0;
  }
  const i = Math.floor((step * patternLength) / totalBeats);
  return ((i % patternLength) + patternLength) % patternLength;
}
