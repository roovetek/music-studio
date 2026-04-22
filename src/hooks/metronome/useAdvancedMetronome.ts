import { useState, useRef, useEffect } from 'react';
import { metronomeAudio, type MetronomeSound } from '../../utils/metronomeAudio';

type AccentLevel = 'none' | 'normal' | 'first';

interface ScheduledVisualStep {
  step: number;
  time: number;
}

export const useAdvancedMetronome = (
  subdivisionMode: 'quarter' | 'eighth' | 'sixteenth' = 'quarter'
) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(90);
  const [currentSound, setCurrentSound] = useState<MetronomeSound>('808-rimshot');
  const [beatCount, setBeatCount] = useState(0);

  const schedulerIdRef = useRef<number | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const nextStepTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const scheduledStepsRef = useRef<ScheduledVisualStep[]>([]);
  const lastDisplayedStepRef = useRef(-1);

  const beatsPerBar = 4;
  const stepsPerBeat =
    subdivisionMode === 'sixteenth' ? 4 : subdivisionMode === 'eighth' ? 2 : 1;
  const totalBeats = beatsPerBar * stepsPerBeat;

  useEffect(() => {
    if (!isPlaying) {
      if (schedulerIdRef.current !== null) {
        clearTimeout(schedulerIdRef.current);
        schedulerIdRef.current = null;
      }
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      scheduledStepsRef.current = [];
      currentStepRef.current = 0;
      nextStepTimeRef.current = 0;
      lastDisplayedStepRef.current = -1;
      setBeatCount(0);
      return;
    }

    let isCancelled = false;
    const lookAheadMs = 25;
    const scheduleAheadTime = 0.1;
    const visualLeadTime = 1 / 120;

    const getAccentLevel = (step: number): AccentLevel => {
      if (step === 0) {
        return 'first';
      }

      return step % stepsPerBeat === 0 ? 'normal' : 'none';
    };

    const syncVisualTracker = () => {
      if (isCancelled) {
        return;
      }

      const audioContext = metronomeAudio.getContext();
      const visibleUntil = audioContext.currentTime + visualLeadTime;

      while (
        scheduledStepsRef.current.length > 0 &&
        scheduledStepsRef.current[0].time <= visibleUntil
      ) {
        const nextStep = scheduledStepsRef.current.shift();
        if (!nextStep) {
          break;
        }

        if (lastDisplayedStepRef.current !== nextStep.step) {
          lastDisplayedStepRef.current = nextStep.step;
          setBeatCount(nextStep.step);
        }
      }

      animationFrameIdRef.current = window.requestAnimationFrame(syncVisualTracker);
    };

    const scheduleNotes = () => {
      if (isCancelled) {
        return;
      }

      const audioContext = metronomeAudio.getContext();
      const secondsPerBeat = 60 / bpm;
      const secondsPerStep = secondsPerBeat / stepsPerBeat;

      while (nextStepTimeRef.current < audioContext.currentTime + scheduleAheadTime) {
        const step = currentStepRef.current;
        const accentLevel = getAccentLevel(step);

        metronomeAudio.playSoundAt(currentSound, nextStepTimeRef.current, accentLevel);
        scheduledStepsRef.current.push({ step, time: nextStepTimeRef.current });

        nextStepTimeRef.current += secondsPerStep;
        currentStepRef.current = (currentStepRef.current + 1) % totalBeats;
      }

      schedulerIdRef.current = window.setTimeout(scheduleNotes, lookAheadMs);
    };

    const start = async () => {
      const audioContext = await metronomeAudio.resume();
      if (isCancelled) {
        return;
      }

      scheduledStepsRef.current = [];
      currentStepRef.current = 0;
      lastDisplayedStepRef.current = -1;
      setBeatCount(0);
      nextStepTimeRef.current = audioContext.currentTime + 0.05;

      scheduleNotes();
      animationFrameIdRef.current = window.requestAnimationFrame(syncVisualTracker);
    };

    void start();

    return () => {
      isCancelled = true;

      if (schedulerIdRef.current !== null) {
        clearTimeout(schedulerIdRef.current);
        schedulerIdRef.current = null;
      }

      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [isPlaying, bpm, currentSound, stepsPerBeat, totalBeats]);

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
