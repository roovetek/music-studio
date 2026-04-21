import { Play, Plus, Minus, Music2, ChevronDown, Square } from 'lucide-react';
import { useAdvancedMetronome } from '../../hooks/metronome/useAdvancedMetronome';
import { soundOptions, metronomeAudio } from '../../utils/metronomeAudio';
import { useRef, useEffect, useState } from 'react';

export const AdvancedMetronome = () => {
  const [subdivisionMode, setSubdivisionMode] = useState<'quarter' | 'eighth' | 'sixteenth'>('quarter');
  const { isPlaying, bpm, setBpm, togglePlay, currentSound, setCurrentSound, beatCount } =
    useAdvancedMetronome(subdivisionMode);
  const [showSoundMenu, setShowSoundMenu] = useState(false);
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

  const handleSoundSelect = (soundId: typeof currentSound) => {
    setCurrentSound(soundId);
    setShowSoundMenu(false);
    metronomeAudio.playSound(soundId, 'none');
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="glass-panel p-8 rounded-3xl">
        <div className="text-center space-y-8">
          <h1 className="text-2xl font-light text-slate-200 tracking-wider">STUDIO METRONOME</h1>

          <div className="bpm-display">
            <div className="text-4xl font-bold text-white tracking-tight">{bpm}</div>
            <div className="text-lg text-slate-400 tracking-widest mt-2">BPM • 4/4</div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mt-4 max-w-md">
            <label className="flex items-center gap-1.5 text-white/80 text-xs">
              <input
                type="radio"
                name="subdivision"
                value="quarter"
                checked={subdivisionMode === 'quarter'}
                onChange={() => setSubdivisionMode('quarter')}
                className="text-blue-400 scale-75"
              />
              Quarter (1 2 3 4)
            </label>
            <label className="flex items-center gap-1.5 text-white/80 text-xs">
              <input
                type="radio"
                name="subdivision"
                value="eighth"
                checked={subdivisionMode === 'eighth'}
                onChange={() => setSubdivisionMode('eighth')}
                className="text-blue-400 scale-75"
              />
              {'Eighth (1 & 2 &)'}
            </label>
            <label className="flex items-center gap-1.5 text-white/80 text-xs">
              <input
                type="radio"
                name="subdivision"
                value="sixteenth"
                checked={subdivisionMode === 'sixteenth'}
                onChange={() => setSubdivisionMode('sixteenth')}
                className="text-blue-400 scale-75"
              />
              16th (1 e + a)
            </label>
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

          <button
            onClick={togglePlay}
            className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white flex items-center justify-center transition-all duration-300 shadow-2xl hover:scale-105 active:scale-95 mx-auto border-4 border-slate-900/50 ${isPlaying ? 'from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 animate-pulse' : ''}`}
            aria-label={isPlaying ? 'Stop' : 'Start'}
          >
            {isPlaying ? (
              <Square className="w-4 h-4" fill="currentColor" />
            ) : (
              <Play className="w-4 h-4" fill="currentColor" />
            )}
          </button>

          {isPlaying && (
            <div className="flex justify-center gap-1">
              {(subdivisionMode === 'sixteenth'
                ? Array.from({ length: 16 }, (_, i) => i)
                : subdivisionMode === 'eighth'
                  ? Array.from({ length: 8 }, (_, i) => i)
                  : [0, 1, 2, 3]
              ).map((i) => {
                const isMainBeat =
                  subdivisionMode === 'quarter' || i % (subdivisionMode === 'sixteenth' ? 4 : 2) === 0;
                const isActive = i === beatCount;
                const baseClasses = 'rounded-full transition-all';
                const durationClass = subdivisionMode === 'sixteenth' ? 'duration-75' : 'duration-100';
                const sizeClass = isActive
                  ? isMainBeat
                    ? 'w-3 h-3'
                    : 'w-2.5 h-2.5'
                  : isMainBeat
                    ? 'w-2.5 h-2.5'
                    : 'w-2 h-2';
                const colorClass = isActive
                  ? 'bg-blue-400 scale-125 opacity-100'
                  : 'bg-blue-400/30 scale-100 opacity-60';

                return (
                  <div key={i} className={`${baseClasses} ${durationClass} ${sizeClass} ${colorClass}`} />
                );
              })}
            </div>
          )}
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
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-lg p-2 z-50 shadow-2xl max-h-72 overflow-y-auto transition-all duration-200 ease-out">
            {soundOptions.map((option) => (
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
                    <div className="text-white/90 text-sm font-semibold truncate">{option.name}</div>
                    <div className="text-white/50 text-xs mt-0.5">{option.description}</div>
                  </div>
                  <div className="text-blue-400/80 text-xs bg-blue-400/10 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                    {option.mood}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
