import { Play, Pause, Plus, Minus } from 'lucide-react';
import { useMetronome } from '../../hooks/metronome/useMetronome';
import { useState } from 'react';

export const Metronome = () => {
  const { isPlaying, bpm, setBpm, togglePlay, soundType, setSoundType } = useMetronome();
  const [showDropdown, setShowDropdown] = useState(false);

  const adjustBpm = (delta: number) => {
    setBpm((prev) => Math.max(30, Math.min(300, prev + delta)));
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="glass-panel p-8 rounded-3xl">
        <div className="text-center space-y-8">
          <h1 className="text-2xl font-light text-slate-200 tracking-wider">
            CLASSIC METRONOME
          </h1>

          <div className="bpm-display">
            <div className="text-8xl font-bold text-white tracking-tight">
              {bpm}
            </div>
            <div className="text-lg text-slate-400 tracking-widest mt-2">
              BPM
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

          <button
            onClick={togglePlay}
            className={`play-btn ${isPlaying ? 'playing' : ''}`}
            aria-label={isPlaying ? 'Stop' : 'Start'}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" fill="currentColor" />
            ) : (
              <Play className="w-8 h-8" fill="currentColor" />
            )}
          </button>

          <button
            onClick={() => setShowDropdown((prev) => !prev)}
            className="dropdown-toggle-btn"
            aria-label="Toggle Sound Dropdown"
          >
            Select Sound
          </button>

          {showDropdown && (
            <div className="dropdown">
              <select
                value={soundType}
                onChange={(e) => setSoundType(e.target.value as 'Beep' | 'Click' | 'Woodblock')}
                className="dropdown-select"
              >
                <option value="Beep">Beep</option>
                <option value="Click">Click</option>
                <option value="Woodblock">Woodblock</option>
              </select>
            </div>
          )}

          {isPlaying && (
            <div className="flex justify-center gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="beat-indicator"
                  style={{ animationDelay: `${i * (60 / bpm)}s` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
