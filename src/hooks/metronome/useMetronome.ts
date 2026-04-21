import { useState, useRef, useEffect } from 'react';

export const useMetronome = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [soundType, setSoundType] = useState<'Beep' | 'Click' | 'Woodblock'>('Beep');

  const audioContextRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const schedulerIdRef = useRef<number | null>(null);
  const currentBeatRef = useRef(0);

  useEffect(() => {
    audioContextRef.current = new AudioContext();

    return () => {
      if (schedulerIdRef.current) {
        clearTimeout(schedulerIdRef.current);
      }
      audioContextRef.current?.close();
    };
  }, []);

  const scheduleNote = (time: number) => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const isAccent = currentBeatRef.current % 4 === 0;

    // Adjust frequency based on sound type
    if (soundType === 'Beep') {
      oscillator.frequency.value = isAccent ? 1200 : 800;
    } else if (soundType === 'Click') {
      oscillator.frequency.value = isAccent ? 1000 : 600;
    } else if (soundType === 'Woodblock') {
      oscillator.frequency.value = isAccent ? 800 : 400;
    }

    gainNode.gain.value = 0.3;
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    oscillator.start(time);
    oscillator.stop(time + 0.05);

    currentBeatRef.current++;
  };

  const scheduler = () => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    const scheduleAheadTime = 0.1;
    while (nextNoteTimeRef.current < audioContext.currentTime + scheduleAheadTime) {
      scheduleNote(nextNoteTimeRef.current);
      const secondsPerBeat = 60.0 / bpm;
      nextNoteTimeRef.current += secondsPerBeat;
    }

    schedulerIdRef.current = window.setTimeout(scheduler, 25);
  };

  const start = () => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    currentBeatRef.current = 0;
    nextNoteTimeRef.current = audioContext.currentTime;
    scheduler();
    setIsPlaying(true);
  };

  const stop = () => {
    if (schedulerIdRef.current) {
      clearTimeout(schedulerIdRef.current);
      schedulerIdRef.current = null;
    }
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  };

  return {
    isPlaying,
    bpm,
    setBpm,
    togglePlay,
    soundType,
    setSoundType,
  };
};
