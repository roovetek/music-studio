import { Play, Plus, Minus, Music2, ChevronDown, Square } from 'lucide-react';
import {
  GUITAR_STRUM_PATTERNS,
  GUITAR_STRUM_FEELS,
  getGuitarStrumPattern,
  type GuitarStrumPatternId,
} from '../../data/guitarStrumPatterns';
import {
  getGroovePatternIdForBeatSource,
  meterPresets,
  useAdvancedMetronome,
  type BeatSource,
  type MeterPresetId,
} from '../../hooks/metronome/useAdvancedMetronome';
import { soundGroupOrder, soundOptions, metronomeAudio } from '../../utils/metronomeAudio';
import { useFixedMenuPosition } from '../../hooks/useFixedMenuPosition';
import { ThemedSelect, type ThemedSelectGroup } from '../ui/ThemedSelect';
import { useRef, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  MetronomeVisualizer,
  type VisualizerMode,
} from './MetronomeVisualizer';

const BEAT_SOURCE_PATTERN_HINT: Partial<Record<BeatSource, string>> = {
  'tabla-bols': 'ta · dhin · dhin · na',
  'piano-arpeggio': 'C · E · G · C′',
  'violin-legato': '— — — —',
  'drums-pattern': 'K · · · S · K · K · · · S · K ·',
  'reggae-one-drop': 'R R D R R R D R',
  'reggae-steppers-8': 'R U R U R U R U',
  'ska-offbeat-chank': 'R R U R R R U R',
  'bossa-8': 'D R D D R U D R',
  'salsa-montuno-8': 'D R D U D R D U',
  'samba-partido-8': 'D G D U D D U D',
};

const VISUAL_PULSE_OPTIONS: { value: VisualizerMode; label: string }[] = [
  { value: 'tracker', label: 'Pulse Bar' },
  { value: 'pendulum', label: 'Pendulum Swing' },
  { value: 'bouncing-ball', label: 'Beat Bounce' },
];

const BEAT_SOURCE_SELECT_GROUPS: ThemedSelectGroup[] = [
  {
    label: 'Neutral',
    options: [
      { value: 'sounds', label: 'Sounds (pick a click below)' },
      { value: 'vocal', label: 'Vocal Pulse' },
      { value: 'syllables', label: 'Syllables (ta-ka-di-mi)' },
    ],
  },
  {
    label: 'Indian classical',
    options: [{ value: 'tabla-bols', label: 'Tabla bols (ta · dhin · dhin · na)' }],
  },
  { label: 'Guitar', options: [{ value: 'guitar-strum', label: 'Strum pattern (down / up)' }] },
  {
    label: 'Reggae & Caribbean',
    options: [
      { value: 'reggae-one-drop', label: 'Reggae: one drop (8th) — organ skank' },
      { value: 'reggae-steppers-8', label: 'Reggae: steppers (8th) — offbeat up-chank' },
      { value: 'ska-offbeat-chank', label: 'Ska: offbeat chank (8th) — brassy chip' },
    ],
  },
  {
    label: 'Latin (groove)',
    options: [
      { value: 'bossa-8', label: 'Bossa nova (8th) — nylon pluck' },
      { value: 'salsa-montuno-8', label: 'Salsa / montuno (8th) — piano' },
      { value: 'samba-partido-8', label: 'Samba: partido alto (8th) — pandeiro' },
    ],
  },
  { label: 'Piano', options: [{ value: 'piano-arpeggio', label: 'Arpeggio (C · E · G · C′)' }] },
  { label: 'Violin', options: [{ value: 'violin-legato', label: 'Legato bow' }] },
  { label: 'Drums', options: [{ value: 'drums-pattern', label: 'Syncopated groove' }] },
];

const SOUND_PATTERN_PLACEHOLDER: Partial<Record<BeatSource, string>> = {
  vocal: 'Vocal Pulse uses a smoother sustained vocal-style synthesized cue.',
  syllables:
    'Syllables: spoken-style one, ta-ka, ta-ka-di-mi with formant synthesis for subdivisions.',
  'tabla-bols': 'Teentaal-style bols (ta · dhin · dhin · na) synthesized with bandpass formants.',
  'guitar-strum':
    'Strum by feel: pick a pattern (D/U, ghosts, rests). Synthesis emulates strum, palm ghost, and silence—swap in real samples from docs when ready.',
  'reggae-one-drop':
    'Dub/organ skank: low-mid body on hits, chiff on ghosts. Backbeats 2/4, rests on 1. Web Audio, not guitar.',
  'reggae-steppers-8':
    'Steppers: same organ engine with steady offbeat up-chanks. Pulse bar shows D vs U from the 8th grid; use 4/4 8th or 16th.',
  'ska-offbeat-chank': 'Brassy square chank; brighter on upstrokes, fast decay—Caribbean offbeat feel.',
  'bossa-8': 'Nylon pluck: soft triangle, longer ring; bossa/MPB syncopation (not strummed guitar).',
  'salsa-montuno-8': 'Piano-tumbao stab: detuned short piano slice for montuno (not strum).',
  'samba-partido-8': 'Pandeiro-like body (membrane + low tone) and rim-ghost; samba / pagode pocket.',
  'piano-arpeggio': 'Arpeggio cycles root, third, fifth, octave for each step in the bar.',
  'violin-legato': 'Sustained bow tone with vibrato; length follows each subdivision step.',
  'drums-pattern': '16-step syncopated groove: kick, snare, hi-hat (mapped to your meter grid).',
};

export const AdvancedMetronome = () => {
  const [meterPresetId, setMeterPresetId] = useState<MeterPresetId>('4-4-quarter');
  const [beatSource, setBeatSource] = useState<BeatSource>('sounds');
  const [guitarStrumPatternId, setGuitarStrumPatternId] =
    useState<GuitarStrumPatternId>('old-faithful');
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('tracker');
  const {
    isPlaying,
    isLeadInActive,
    leadInCount,
    bpm,
    setBpm,
    togglePlay,
    currentSound,
    setCurrentSound,
    beatCount,
    currentStepTime,
    secondsPerStep,
    stepsPerBeat,
    totalBeats,
    stepAudioRoles,
    stepStrumTokens,
  } = useAdvancedMetronome(meterPresetId, true, beatSource, 'voice', guitarStrumPatternId);
  const [showSoundMenu, setShowSoundMenu] = useState(false);
  const [soundQuery, setSoundQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const soundMenuPanelRef = useRef<HTMLDivElement>(null);
  const soundTriggerRef = useRef<HTMLButtonElement>(null);
  const soundMenuPosition = useFixedMenuPosition(showSoundMenu, soundTriggerRef, 'up', 55);
  const appShellEl =
    typeof document !== 'undefined'
      ? (document.querySelector('.app-shell') as HTMLElement | null)
      : null;
  const guitarStrumSelectGroups: ThemedSelectGroup[] = useMemo(
    () =>
      GUITAR_STRUM_FEELS.map((feel) => {
        const options = GUITAR_STRUM_PATTERNS.filter((p) => p.feelId === feel.id).map((p) => ({
          value: p.id,
          label: p.name,
        }));
        return { label: feel.label, options };
      }).filter((g) => g.options.length > 0),
    [],
  );
  const meterSelectOptions = useMemo(
    () => meterPresets.map((p) => ({ value: p.id, label: p.label })),
    [],
  );

  const formatGuitarStrumHint = (id: GuitarStrumPatternId) => {
    const steps = getGuitarStrumPattern(id).steps;
    return steps
      .map((t) => (t === 'D' ? '↓' : t === 'U' ? '↑' : t === 'G' ? '·' : '—'))
      .join(' ');
  };
  const fixedGroovePatternId = getGroovePatternIdForBeatSource(beatSource);
  const displayGuitarPatternId: GuitarStrumPatternId =
    fixedGroovePatternId ?? guitarStrumPatternId;
  const activeGuitarPattern = getGuitarStrumPattern(displayGuitarPatternId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const t = event.target as Node;
      if (menuRef.current?.contains(t) || soundMenuPanelRef.current?.contains(t)) {
        return;
      }
      setShowSoundMenu(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const adjustBpm = (delta: number) => {
    setBpm((prev) => Math.max(30, Math.min(300, prev + delta)));
  };

  const selectedSoundOption = soundOptions.find((s) => s.id === currentSound);
  const normalizedQuery = soundQuery.trim().toLowerCase();
  const filteredSoundOptions = soundOptions.filter((option) => {
    if (!normalizedQuery) {
      return true;
    }

    const searchableText = [
      option.name,
      option.description,
      option.mood,
      option.instrumentFamily,
      ...option.tags,
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
  const groupedSoundOptions = soundGroupOrder
    .map((group) => ({
      group,
      options: filteredSoundOptions.filter((option) => option.group === group),
    }))
    .filter((section) => section.options.length > 0);

  const handleSoundSelect = (soundId: typeof currentSound) => {
    setCurrentSound(soundId);
    setShowSoundMenu(false);
    setSoundQuery('');
    metronomeAudio.playSound(soundId, 'none');
  };

  const soundPickerMenuContent = (
    <>
      <div className="metronome-menu-header sticky top-0 z-10 p-2">
        <input
          type="search"
          value={soundQuery}
          onChange={(e) => setSoundQuery(e.target.value)}
          placeholder="Search sounds, styles, or tags"
          className="metronome-search w-full rounded-md px-3 py-2 text-sm outline-none"
        />
      </div>

      <div className="space-y-3 p-1">
        {groupedSoundOptions.length > 0 ? (
          groupedSoundOptions.map((section) => (
            <div key={section.group} className="space-y-1">
              <div className="metronome-group-label px-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                {section.group}
              </div>
              {section.options.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => handleSoundSelect(option.id)}
                  className={`metronome-sound-option w-full text-left px-4 py-3 rounded-lg border transition-all duration-150 ${currentSound === option.id ? 'is-active' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="metronome-option-title text-sm font-semibold truncate">{option.name}</div>
                        {option.recommended ? (
                          <span className="metronome-badge rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
                            Practice Pick
                          </span>
                        ) : null}
                      </div>
                      <div className="metronome-option-desc text-xs mt-0.5">{option.description}</div>
                    </div>
                    <div className="metronome-option-tag text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                      {option.mood}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ))
        ) : (
          <div className="metronome-empty-state px-3 py-6 text-center text-sm">No sounds match that search.</div>
        )}
      </div>
    </>
  );

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="glass-panel p-8 rounded-3xl">
        <div className="text-center space-y-8">
          <h1 className="metronome-title text-2xl font-light tracking-wider">STUDIO METRONOME</h1>

          <div className="metronome-topbar grid gap-5 text-left md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <div className="bpm-display flex-1">
              <div className="flex items-baseline justify-center gap-3 md:justify-start">
                <div className="metronome-bpm-value text-4xl font-bold tracking-tight">{bpm}</div>
                <div className="metronome-bpm-label text-lg tracking-widest">BPM (Tempo)</div>
              </div>
            </div>

            <div className="metronome-transport-stack flex w-full flex-col gap-3 md:w-auto md:min-w-[28rem]">
              <div className="flex items-center justify-center gap-3 md:justify-end">
                <button
                  onClick={togglePlay}
                  className={`metronome-play-btn flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 hover:scale-105 active:scale-95 ${isPlaying ? 'is-playing animate-pulse' : ''}`}
                  aria-label={isPlaying ? 'Stop' : 'Start'}
                >
                  {isPlaying ? (
                    <Square className="h-3.5 w-3.5" fill="currentColor" />
                  ) : (
                    <Play className="h-3.5 w-3.5" fill="currentColor" />
                  )}
                </button>
                <span className="metronome-play-label text-sm font-semibold uppercase tracking-[0.18em]">
                  {isPlaying ? 'Stop' : 'Start'}
                </span>
              </div>

              <div className="flex items-center justify-center gap-3 md:justify-end md:gap-4">
                <button
                  onClick={() => adjustBpm(-1)}
                  className="control-btn"
                  aria-label="Decrease BPM"
                >
                  <Minus className="w-5 h-5" />
                </button>

                <button
                  onClick={() => adjustBpm(-10)}
                  className="control-btn-small"
                  aria-label="Decrease BPM by 10"
                >
                  -10
                </button>

                <input
                  type="range"
                  min="30"
                  max="300"
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="bpm-slider"
                />

                <button
                  onClick={() => adjustBpm(10)}
                  className="control-btn-small"
                  aria-label="Increase BPM by 10"
                >
                  +10
                </button>

                <button
                  onClick={() => adjustBpm(1)}
                  className="control-btn"
                  aria-label="Increase BPM"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 text-left sm:grid-cols-2">
            <div className="metronome-card rounded-2xl p-4 shadow-inner">
              <label className="metronome-field-label mb-2 block text-xs font-semibold uppercase tracking-[0.18em]">
                Time Signature
              </label>
              <ThemedSelect
                value={meterPresetId}
                onChange={(v) => setMeterPresetId(v as MeterPresetId)}
                placement="down"
                options={meterSelectOptions}
                triggerClassName="metronome-select themed-select-trigger w-full rounded-xl px-4 py-3 text-sm outline-none"
                aria-label="Select time signature"
              />
            </div>

            <div className="metronome-card rounded-2xl p-4 shadow-inner">
              <label className="metronome-field-label mb-2 block text-xs font-semibold uppercase tracking-[0.18em]">
                Visual Pulse Mode
              </label>
              <ThemedSelect
                value={visualizerMode}
                onChange={(v) => setVisualizerMode(v as VisualizerMode)}
                placement="down"
                options={VISUAL_PULSE_OPTIONS}
                triggerClassName="metronome-select themed-select-trigger w-full rounded-xl px-4 py-3 text-sm outline-none"
                aria-label="Select visual pulse mode"
              />
            </div>
          </div>

          <div className="metronome-visualizer-frame relative rounded-2xl p-3 shadow-inner">
            {isLeadInActive ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="metronome-lead-in rounded-full px-5 py-2 text-sm font-semibold tracking-[0.14em] shadow-lg backdrop-blur-sm">
                  Lead-in: {leadInCount ?? 1}
                </div>
              </div>
            ) : null}

            <MetronomeVisualizer
              mode={visualizerMode}
              isActive={isPlaying && !isLeadInActive}
              beatCount={beatCount}
              stepsPerBeat={stepsPerBeat}
              totalBeats={totalBeats}
              currentStepTime={currentStepTime}
              secondsPerStep={secondsPerStep}
              stepAudioRoles={stepAudioRoles}
              stepStrumTokens={stepStrumTokens}
            />
          </div>

          <div className="metronome-card rounded-2xl p-4 shadow-inner text-left">
            <label className="metronome-field-label mb-2 block text-xs font-semibold uppercase tracking-[0.18em]">
              Beat Source
            </label>
            <ThemedSelect
              value={beatSource}
              onChange={(v) => {
                setShowSoundMenu(false);
                setBeatSource(v as BeatSource);
              }}
              groups={BEAT_SOURCE_SELECT_GROUPS}
              placement="up"
              maxVh={55}
              triggerClassName="metronome-select themed-select-trigger w-full rounded-xl px-4 py-3 text-sm outline-none"
              aria-label="Select beat source"
            />
            {beatSource === 'guitar-strum' || fixedGroovePatternId ? (
              <p className="metronome-pattern-hint mt-2 font-mono text-xs tracking-tight">
                {activeGuitarPattern.name}: {formatGuitarStrumHint(displayGuitarPatternId)}
              </p>
            ) : BEAT_SOURCE_PATTERN_HINT[beatSource] ? (
              <p className="metronome-pattern-hint mt-2 font-mono text-xs tracking-tight">
                Pattern: {BEAT_SOURCE_PATTERN_HINT[beatSource]}
              </p>
            ) : null}
          </div>

          <div className="metronome-card rounded-2xl p-4 shadow-inner text-left" ref={menuRef}>
            <label className="metronome-field-label mb-2 block text-xs font-semibold uppercase tracking-[0.18em]">
              Sound Pattern
            </label>

            {beatSource === 'guitar-strum' ? (
              <div className="space-y-2">
                <label
                  className="metronome-field-label block text-xs font-semibold uppercase tracking-[0.18em]"
                  htmlFor="guitar-strum-pattern"
                >
                  Strum feel and pattern
                </label>
                <ThemedSelect
                  id="guitar-strum-pattern"
                  value={guitarStrumPatternId}
                  onChange={(v) => setGuitarStrumPatternId(v as GuitarStrumPatternId)}
                  groups={guitarStrumSelectGroups}
                  placement="up"
                  maxVh={50}
                  triggerClassName="metronome-select themed-select-trigger w-full rounded-xl px-4 py-3 text-sm outline-none"
                  aria-label="Guitar strum pattern by feel"
                />
                <p className="metronome-helper-copy text-xs leading-relaxed">
                  <span className="metronome-helper-strong">Best for: </span>
                  {activeGuitarPattern.bestFor}
                </p>
                <p className="metronome-muted-box rounded-lg px-3 py-2 text-xs">
                  Notation: {activeGuitarPattern.notation}
                </p>
              </div>
            ) : fixedGroovePatternId ? (
              <div className="space-y-2">
                <p className="metronome-helper-copy text-xs leading-relaxed">
                  <span className="metronome-helper-strong">Pattern: </span>
                  {activeGuitarPattern.name}
                </p>
                <p className="metronome-helper-copy text-xs leading-relaxed">
                  <span className="metronome-helper-strong">Best for: </span>
                  {activeGuitarPattern.bestFor}
                </p>
                <p className="metronome-muted-box rounded-lg px-3 py-2 text-xs">
                  Notation: {activeGuitarPattern.notation}
                </p>
                <p className="metronome-helper-copy text-xs leading-relaxed">
                  {SOUND_PATTERN_PLACEHOLDER[beatSource] ?? ''}
                </p>
              </div>
            ) : beatSource === 'sounds' ? (
              <div className="relative">
                <button
                  type="button"
                  ref={soundTriggerRef}
                  onClick={() => setShowSoundMenu(!showSoundMenu)}
                  className="metronome-pattern-trigger w-full flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
                >
                  <Music2 size={16} className="metronome-pattern-icon flex-shrink-0" />
                  <span className="metronome-pattern-text text-sm font-medium flex-1 text-left truncate">
                    {selectedSoundOption?.name}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`metronome-pattern-chevron transition-transform flex-shrink-0 ${showSoundMenu ? 'rotate-180' : ''}`}
                  />
                </button>

                {showSoundMenu &&
                  (appShellEl
                    ? createPortal(
                        <div
                          ref={soundMenuPanelRef}
                          className="metronome-menu rounded-lg p-2 transition-all duration-200 ease-out"
                          style={soundMenuPosition}
                        >
                          {soundPickerMenuContent}
                        </div>,
                        appShellEl,
                      )
                    : (
                        <div
                          ref={soundMenuPanelRef}
                          className="metronome-menu rounded-lg p-2 transition-all duration-200 ease-out"
                          style={soundMenuPosition}
                        >
                          {soundPickerMenuContent}
                        </div>
                      ))}
              </div>
            ) : (
              <div className="metronome-muted-box rounded-xl px-4 py-3 text-sm shadow-inner">
                {SOUND_PATTERN_PLACEHOLDER[beatSource] ??
                  'Select a beat source. Sound patterns apply when “Sounds” is active.'}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
};
