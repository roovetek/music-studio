export type AppThemeId =
  | 'metronome-manuscript'
  | 'green-room'
  | 'booth-take'
  | 'jazz-afterhours'
  | 'riyaz-dawn'
  | 'house-lights'
  | 'arctic-partitur'
  | 'subwoofer-haze';

export interface AppThemeOption {
  id: AppThemeId;
  name: string;
  vibe: string;
  description: string;
  themeColor: string;
}

/** Defaults to a calm, readable paper palette for first paint and new installs. */
export const defaultAppThemeId: AppThemeId = 'metronome-manuscript';

export const appThemeOptions: AppThemeOption[] = [
  {
    id: 'metronome-manuscript',
    name: 'Metronome & Manuscript',
    vibe: 'Sheet music, pencil marks, and clarity.',
    description: 'Warm paper, ink-like type, and a clear cobalt accent.',
    themeColor: '#f2ebe1',
  },
  {
    id: 'green-room',
    name: 'Green Room',
    vibe: 'Pre-show calm; rehearsal stillness.',
    description: 'Sage and deep forest with mint highlights.',
    themeColor: '#0f1f16',
  },
  {
    id: 'booth-take',
    name: 'Booth Take',
    vibe: 'DAW, headphones, one more pass.',
    description: 'Charcoal panels with a single hot lime line through the mix.',
    themeColor: '#0f1318',
  },
  {
    id: 'jazz-afterhours',
    name: 'Jazz After Hours',
    vibe: 'Tape hiss, wood, and amber glass.',
    description: 'Browns and ember orange with a smoky club feel.',
    themeColor: '#1c120a',
  },
  {
    id: 'riyaz-dawn',
    name: 'Riyaz Before Dawn',
    vibe: 'Long tone rows and first light.',
    description: 'Indigo void with saffron and old gold.',
    themeColor: '#12081e',
  },
  {
    id: 'house-lights',
    name: 'House Lights Down',
    vibe: 'Recital black; one warm beam.',
    description: 'Stage-dark with a gold spotlight.',
    themeColor: '#0a0a0a',
  },
  {
    id: 'arctic-partitur',
    name: 'Arctic Partitur',
    vibe: 'Daylight practice; crisp contrast.',
    description: 'Cool paper-white and sky blue.',
    themeColor: '#e6eef5',
  },
  {
    id: 'subwoofer-haze',
    name: 'Subwoofer Haze',
    vibe: 'Groove, haze, and bedroom oomph.',
    description: 'Dusty violet smoke with coral pulse.',
    themeColor: '#18141f',
  },
];
