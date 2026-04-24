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
    <div className="relative w-full max-w-lg mx-auto">
      <div className="glass-panel p-8 rounded-3xl">
        <div className="text-center space-y-8">
          <h1 className="text-2xl font-light text-slate-200 tracking-wider">STUDIO METRONOME</h1>

          <div className="bpm-display">
            <div className="flex items-baseline justify-center gap-3">
              <div className="text-4xl font-bold text-white tracking-tight">{bpm}</div>
              <div className="text-lg text-slate-400 tracking-widest">BPM (Tempo)</div>
            </div>
          </div>

          <div className="grid gap-4 text-left sm:grid-cols-[0.95fr_1.25fr]" ref={menuRef}>
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/35 p-4 shadow-inner">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Time Signature
              </label>
              <select
                value={meterPresetId}
                onChange={(e) => setMeterPresetId(e.target.value as MeterPresetId)}
                className="w-full rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 shadow-lg outline-none focus:border-blue-400/60"
                aria-label="Select time signature"
              >
                {meterPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/35 p-4 shadow-inner">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Sound Pattern
              </label>

              {beatSource === 'sounds' ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSoundMenu(!showSoundMenu)}
                    className="w-full flex items-center gap-3 bg-slate-900/70 backdrop-blur-xl border border-slate-700/60 rounded-xl px-4 py-3 hover:bg-slate-800/70 transition-colors shadow-lg"
                  >
                    <Music2 size={16} className="text-slate-300 flex-shrink-0" />
                    <span className="text-white/80 text-sm font-medium flex-1 text-left truncate">
                      {selectedSoundOption?.name}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-white/40 transition-transform flex-shrink-0 ${showSoundMenu ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showSoundMenu && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-lg p-2 z-50 shadow-2xl max-h-80 overflow-y-auto transition-all duration-200 ease-out sm:min-w-[21rem]">
                      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-xl p-2 border-b border-slate-700/40">
                        <input
                          type="search"
                          value={soundQuery}
                          onChange={(e) => setSoundQuery(e.target.value)}
                          placeholder="Search sounds, styles, or tags"
                          className="w-full rounded-md border border-slate-700/60 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400/60"
                        />
                      </div>

                      <div className="space-y-3 p-1">
                        {groupedSoundOptions.length > 0 ? (
                          groupedSoundOptions.map((section) => (
                            <div key={section.group} className="space-y-1">
                              <div className="px-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                {section.group}
                              </div>
                              {section.options.map((option) => (
                                <button
                                  type="button"
                                  key={option.id}
                                  onClick={() => handleSoundSelect(option.id)}
                                  className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-150 ${
                                    currentSound === option.id
                                      ? 'bg-blue-500/30 border border-blue-400/50'
                                      : 'hover:bg-slate-700/40 border border-transparent'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <div className="text-white/90 text-sm font-semibold truncate">{option.name}</div>
                                        {option.recommended ? (
                                          <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                                            Practice Pick
                                          </span>
                                        ) : null}
                                      </div>
                                      <div className="text-white/50 text-xs mt-0.5">{option.description}</div>
                                    </div>
                                    <div className="text-blue-400/80 text-xs bg-blue-400/10 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                                      {option.mood}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-6 text-center text-sm text-slate-400">
                            No sounds match that search.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3 text-sm text-slate-400 shadow-inner">
                  {SOUND_PATTERN_PLACEHOLDER[beatSource] ??
                    'Select a beat source. Sound patterns apply when “Sounds” is active.'}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/35 p-4 shadow-inner">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Beat Source
              </label>
              <select
                value={beatSource}
                onChange={(e) => {
                  setShowSoundMenu(false);
                  setBeatSource(e.target.value as BeatSource);
                }}
                className="w-full rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 shadow-lg outline-none focus:border-blue-400/60"
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
                <p className="mt-2 font-mono text-xs tracking-tight text-sky-300/90">
                  Pattern: {BEAT_SOURCE_PATTERN_HINT[beatSource]}
                </p>
              ) : null}
              <p className="mt-3 text-xs leading-5 text-slate-400">
                <strong className="text-slate-300">Sounds</strong> uses the pick below. Other modes use built-in
                Web Audio patterns (no sample files). Use 8th or 16th time signatures for strum and arpeggio
                lines that match typical subdivisions.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/35 p-4 shadow-inner">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Visual Pulse Style
              </label>
              <select
                value={visualizerMode}
                onChange={(e) => setVisualizerMode(e.target.value as VisualizerMode)}
                className="w-full rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 shadow-lg outline-none focus:border-blue-400/60"
                aria-label="Select visual pulse style"
              >
                <option value="tracker">Pulse Bar</option>
                <option value="pendulum">Pendulum Swing</option>
                <option value="bouncing-ball">Beat Bounce</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
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

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={togglePlay}
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-900/50 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:from-blue-400 hover:to-blue-600 active:scale-95 ${isPlaying ? 'from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 animate-pulse' : ''}`}
              aria-label={isPlaying ? 'Stop' : 'Start'}
            >
              {isPlaying ? (
                <Square className="h-3.5 w-3.5" fill="currentColor" />
              ) : (
                <Play className="h-3.5 w-3.5" fill="currentColor" />
              )}
            </button>
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              {isPlaying ? 'Stop' : 'Start'}
            </span>
          </div>

          <div className="relative rounded-2xl border border-slate-700/40 bg-slate-950/45 p-3 shadow-inner">
            {isLeadInActive ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="rounded-full border border-sky-300/30 bg-slate-950/78 px-5 py-2 text-sm font-semibold tracking-[0.14em] text-sky-100 shadow-lg backdrop-blur-sm">
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
        </div>
      </div>

    </div>
  );
};
