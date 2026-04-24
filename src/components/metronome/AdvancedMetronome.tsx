import { Play, Plus, Minus, Music2, ChevronDown, Square } from 'lucide-react';
import {
  meterPresets,
  useAdvancedMetronome,
  type BeatSource,
  type MeterPresetId,
} from '../../hooks/metronome/useAdvancedMetronome';
import { soundGroupOrder, soundOptions, metronomeAudio } from '../../utils/metronomeAudio';
import { useRef, useEffect, useState } from 'react';
import {
  MetronomeVisualizer,
  type VisualizerMode,
} from './MetronomeVisualizer';

const BEAT_SOURCE_PATTERN_HINT: Partial<Record<BeatSource, string>> = {
  'tabla-bols': 'ta · dhin · dhin · na',
  'guitar-strum': '↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑',
  'piano-arpeggio': 'C · E · G · C′',
  'violin-legato': '— — — —',
  'drums-pattern': 'K · · · S · K · K · · · S · K ·',
};

const SOUND_PATTERN_PLACEHOLDER: Partial<Record<BeatSource, string>> = {
  vocal: 'Vocal Pulse uses a smoother sustained vocal-style synthesized cue.',
  syllables:
    'Syllables: spoken-style one, ta-ka, ta-ka-di-mi with formant synthesis for subdivisions.',
  'tabla-bols': 'Teentaal-style bols (ta · dhin · dhin · na) synthesized with bandpass formants.',
  'guitar-strum': 'Strum pattern alternates down / up across each metronome step (emulated chord).',
  'piano-arpeggio': 'Arpeggio cycles root, third, fifth, octave for each step in the bar.',
  'violin-legato': 'Sustained bow tone with vibrato; length follows each subdivision step.',
  'drums-pattern': '16-step syncopated groove: kick, snare, hi-hat (mapped to your meter grid).',
};

export const AdvancedMetronome = () => {
  const [meterPresetId, setMeterPresetId] = useState<MeterPresetId>('4-4-quarter');
  const [beatSource, setBeatSource] = useState<BeatSource>('sounds');
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
  } = useAdvancedMetronome(meterPresetId, true, beatSource, 'voice');
  const [showSoundMenu, setShowSoundMenu] = useState(false);
  const [soundQuery, setSoundQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowSoundMenu(false);
      }
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
              <select
                value={meterPresetId}
                onChange={(e) => setMeterPresetId(e.target.value as MeterPresetId)}
                className="metronome-select w-full rounded-xl px-4 py-3 text-sm outline-none"
                aria-label="Select time signature"
              >
                {meterPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="metronome-card rounded-2xl p-4 shadow-inner">
              <label className="metronome-field-label mb-2 block text-xs font-semibold uppercase tracking-[0.18em]">
                Visual Pulse Style
              </label>
              <select
                value={visualizerMode}
                onChange={(e) => setVisualizerMode(e.target.value as VisualizerMode)}
                className="metronome-select w-full rounded-xl px-4 py-3 text-sm outline-none"
                aria-label="Select visual pulse style"
              >
                <option value="tracker">Pulse Bar</option>
                <option value="pendulum">Pendulum Swing</option>
                <option value="bouncing-ball">Beat Bounce</option>
              </select>
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
            />
          </div>

          <div className="metronome-card rounded-2xl p-4 shadow-inner text-left">
            <label className="metronome-field-label mb-2 block text-xs font-semibold uppercase tracking-[0.18em]">
              Beat Source
            </label>
            <select
              value={beatSource}
              onChange={(e) => {
                setShowSoundMenu(false);
                setBeatSource(e.target.value as BeatSource);
              }}
              className="metronome-select w-full rounded-xl px-4 py-3 text-sm outline-none"
              aria-label="Select beat source"
            >
              <optgroup label="Neutral">
                <option value="sounds">Sounds (pick a click below)</option>
                <option value="vocal">Vocal Pulse</option>
                <option value="syllables">Syllables (ta-ka-di-mi)</option>
              </optgroup>
              <optgroup label="Indian classical">
                <option value="tabla-bols">Tabla bols (ta · dhin · dhin · na)</option>
              </optgroup>
              <optgroup label="Guitar">
                <option value="guitar-strum">Strum pattern (down / up)</option>
              </optgroup>
              <optgroup label="Piano">
                <option value="piano-arpeggio">Arpeggio (C · E · G · C′)</option>
              </optgroup>
              <optgroup label="Violin">
                <option value="violin-legato">Legato bow</option>
              </optgroup>
              <optgroup label="Drums">
                <option value="drums-pattern">Syncopated groove</option>
              </optgroup>
            </select>
            {BEAT_SOURCE_PATTERN_HINT[beatSource] ? (
              <p className="metronome-pattern-hint mt-2 font-mono text-xs tracking-tight">
                Pattern: {BEAT_SOURCE_PATTERN_HINT[beatSource]}
              </p>
            ) : null}
          </div>

          <div className="metronome-card rounded-2xl p-4 shadow-inner text-left" ref={menuRef}>
            <label className="metronome-field-label mb-2 block text-xs font-semibold uppercase tracking-[0.18em]">
              Sound Pattern
            </label>

            {beatSource === 'sounds' ? (
              <div className="relative">
                <button
                  type="button"
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

                {showSoundMenu && (
                  <div className="metronome-menu absolute top-full left-0 right-0 mt-2 rounded-lg p-2 z-50 max-h-80 overflow-y-auto transition-all duration-200 ease-out sm:min-w-[21rem]">
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
                        <div className="metronome-empty-state px-3 py-6 text-center text-sm">
                          No sounds match that search.
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
