import { Play, Plus, Minus, Music2, ChevronDown, Square } from 'lucide-react';
import {
  meterPresets,
  useAdvancedMetronome,
  type MeterPresetId,
} from '../../hooks/metronome/useAdvancedMetronome';
import { soundGroupOrder, soundOptions, metronomeAudio } from '../../utils/metronomeAudio';
import { useRef, useEffect, useState } from 'react';
import {
  MetronomeVisualizer,
  type VisualizerMode,
} from './MetronomeVisualizer';

export const AdvancedMetronome = () => {
  const [meterPresetId, setMeterPresetId] = useState<MeterPresetId>('4-4-quarter');
  const [leadInEnabled, setLeadInEnabled] = useState(true);
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
    meterLabel,
  } = useAdvancedMetronome(meterPresetId, leadInEnabled);
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

    const searchableText = [option.name, option.description, option.mood, ...option.tags]
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
    <div className="relative w-full max-w-md mx-auto">
      <div className="glass-panel p-8 rounded-3xl">
        <div className="text-center space-y-8">
          <h1 className="text-2xl font-light text-slate-200 tracking-wider">STUDIO METRONOME</h1>

          <div className="bpm-display">
            <div className="text-4xl font-bold text-white tracking-tight">{bpm}</div>
            <div className="text-lg text-slate-400 tracking-widest mt-2">BPM (Tempo)</div>
            <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">{meterLabel}</div>
          </div>

          <div className="mx-auto max-w-xs text-left">
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

          <label className="flex items-center justify-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={leadInEnabled}
              onChange={(e) => setLeadInEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-400"
            />
            Lead-in voice count
          </label>

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
              className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white flex items-center justify-center transition-all duration-300 shadow-2xl hover:scale-105 active:scale-95 border-4 border-slate-900/50 ${isPlaying ? 'from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 animate-pulse' : ''}`}
              aria-label={isPlaying ? 'Stop' : 'Start'}
            >
              {isPlaying ? (
                <Square className="w-4 h-4" fill="currentColor" />
              ) : (
                <Play className="w-4 h-4" fill="currentColor" />
              )}
            </button>

            <select
              value={visualizerMode}
              onChange={(e) => setVisualizerMode(e.target.value as VisualizerMode)}
              className="rounded-xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 shadow-lg outline-none focus:border-blue-400/60"
              aria-label="Select metronome visualizer"
            >
              <option value="tracker">Pulse Bar</option>
              <option value="pendulum">Pendulum Swing</option>
              <option value="bouncing-ball">Beat Bounce</option>
            </select>
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

      <div className="relative mt-4" ref={menuRef}>
        <button
          type="button"
          onClick={() => setShowSoundMenu(!showSoundMenu)}
          className="w-full flex items-center gap-3 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-lg px-4 py-3 hover:bg-slate-800/60 transition-colors shadow-lg"
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
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-lg p-2 z-50 shadow-2xl max-h-80 overflow-y-auto transition-all duration-200 ease-out">
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
    </div>
  );
};
