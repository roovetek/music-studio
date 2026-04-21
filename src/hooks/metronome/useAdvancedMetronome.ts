import { useState, useRef, useEffect } from 'react';
import { metronomeAudio, type MetronomeSound } from '../../utils/metronomeAudio';

export const useAdvancedMetronome = (
  subdivisionMode: 'quarter' | 'eighth' | 'sixteenth' = 'quarter'
) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [currentSound, setCurrentSound] = useState<MetronomeSound>('808-rimshot');
  const [beatCount, setBeatCount] = useState(0);

  const intervalRef = useRef<number | null>(null);

  const totalBeats = subdivisionMode === 'sixteenth' ? 16 : subdivisionMode === 'eighth' ? 8 : 4;
  const intervalDivider = subdivisionMode === 'sixteenth' ? 4 : subdivisionMode === 'eighth' ? 2 : 1;

  useEffect(() => {
    if (isPlaying) {
      const interval = 60000 / bpm / intervalDivider;
      let expectedTime = performance.now() + interval;

      const tick = () => {
        setBeatCount((prev) => {
          let accentLevel: 'none' | 'normal' | 'first' = 'none';

          if (subdivisionMode === 'quarter') {
            accentLevel = prev === 0 ? 'first' : 'none';
          } else if (subdivisionMode === 'eighth') {
            accentLevel = prev % 2 === 0 ? (prev === 0 ? 'first' : 'normal') : 'none';
          } else if (subdivisionMode === 'sixteenth') {
            accentLevel = prev % 4 === 0 ? (prev === 0 ? 'first' : 'normal') : 'none';
          }

          metronomeAudio.playSound(currentSound, accentLevel);
          return (prev + 1) % totalBeats;
        });

        const drift = performance.now() - expectedTime;
        expectedTime += interval;

        intervalRef.current = window.setTimeout(tick, Math.max(0, interval - drift));
      };

      intervalRef.current = window.setTimeout(tick, interval);

      return () => {
        if (intervalRef.current) {
          clearTimeout(intervalRef.current);
        }
      };
    } else {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
      setBeatCount(0);
    }
  }, [isPlaying, bpm, currentSound, subdivisionMode, totalBeats, intervalDivider]);

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  return {
    isPlaying,
    bpm,
    setBpm,
    togglePlay,
    currentSound,
    setCurrentSound,
    beatCount,
  };
};
