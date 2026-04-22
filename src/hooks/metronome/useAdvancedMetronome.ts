import { useState, useRef, useEffect } from 'react';
import { metronomeAudio, type MetronomeSound } from '../../utils/metronomeAudio';

type AccentLevel = 'none' | 'normal' | 'first';
type PlaybackState = 'stopped' | 'lead-in' | 'playing';
export type MeterPresetId =
  | '4-4-quarter'
  | '4-4-eighth'
  | '4-4-sixteenth'
  | '2-4'
  | '2-2'
  | '6-8';

interface MeterPreset {
  id: MeterPresetId;
  label: string;
  beatsPerBar: number;
  stepsPerBeat: number;
  accentedBeats: number[];
}

export const meterPresets: MeterPreset[] = [
  {
    id: '4-4-quarter',
    label: '4/4 - Quarter Notes',
    beatsPerBar: 4,
    stepsPerBeat: 1,
    accentedBeats: [0, 1, 2, 3],
  },
  {
    id: '4-4-eighth',
    label: '4/4 - Eighth Notes',
    beatsPerBar: 4,
    stepsPerBeat: 2,
    accentedBeats: [0, 1, 2, 3],
  },
  {
    id: '4-4-sixteenth',
    label: '4/4 - 16th Notes',
    beatsPerBar: 4,
    stepsPerBeat: 4,
    accentedBeats: [0, 1, 2, 3],
  },
  {
    id: '2-4',
    label: '2/4',
    beatsPerBar: 2,
    stepsPerBeat: 1,
    accentedBeats: [0, 1],
  },
  {
    id: '2-2',
    label: '2/2',
    beatsPerBar: 2,
    stepsPerBeat: 1,
    accentedBeats: [0, 1],
  },
  {
    id: '6-8',
    label: '6/8',
    beatsPerBar: 6,
    stepsPerBeat: 1,
    accentedBeats: [0, 3],
  },
];

interface ScheduledVisualStep {
  step: number;
  time: number;
}

export const useAdvancedMetronome = (
  meterPresetId: MeterPresetId = '4-4-quarter',
  leadInEnabled = true
) => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [bpm, setBpm] = useState(90);
  const [currentSound, setCurrentSound] = useState<MetronomeSound>('woodblock');
  const [beatCount, setBeatCount] = useState(0);
  const [leadInCount, setLeadInCount] = useState<number | null>(null);
  const [currentStepTime, setCurrentStepTime] = useState(0);

  const schedulerIdRef = useRef<number | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const leadInTimeoutIdsRef = useRef<number[]>([]);
  const nextStepTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const scheduledStepsRef = useRef<ScheduledVisualStep[]>([]);
  const lastDisplayedStepRef = useRef(-1);

  const selectedMeterPreset =
    meterPresets.find((preset) => preset.id === meterPresetId) ?? meterPresets[0];
  const { beatsPerBar, stepsPerBeat, accentedBeats } = selectedMeterPreset;
  const totalBeats = beatsPerBar * stepsPerBeat;
  const secondsPerStep = 60 / bpm / stepsPerBeat;

  useEffect(() => {
    return () => {
      if (schedulerIdRef.current !== null) {
        clearTimeout(schedulerIdRef.current);
      }
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      leadInTimeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      leadInTimeoutIdsRef.current = [];
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (playbackState === 'stopped') {
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
      leadInTimeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      leadInTimeoutIdsRef.current = [];
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setLeadInCount(null);
      setBeatCount(0);
      setCurrentStepTime(0);
      return;
    }

    if (playbackState === 'lead-in') {
      const countWords = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];
      const countLabels = Array.from({ length: beatsPerBar }, (_, index) => countWords[index] ?? String(index + 1));
      const millisecondsPerBeat = 60000 / bpm;
      let isCancelled = false;

      const speakCount = (label: string) => {
        if (!('speechSynthesis' in window)) {
          return;
        }

        const utterance = new SpeechSynthesisUtterance(label);
        utterance.rate = Math.min(1.5, Math.max(1, bpm / 90));
        utterance.pitch = 1;
        utterance.volume = 1;
        window.speechSynthesis.speak(utterance);
      };

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      const timeoutIds = countLabels.map((label, index) =>
        window.setTimeout(() => {
          if (isCancelled) {
            return;
          }

          setLeadInCount(index + 1);
          speakCount(label);
        }, index * millisecondsPerBeat)
      );

      const startTimeoutId = window.setTimeout(() => {
        if (isCancelled) {
          return;
        }

        setLeadInCount(null);
        setPlaybackState('playing');
      }, countLabels.length * millisecondsPerBeat);

      leadInTimeoutIdsRef.current = [...timeoutIds, startTimeoutId];

      return () => {
        isCancelled = true;
        leadInTimeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
        leadInTimeoutIdsRef.current = [];
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      };
    }

    let isCancelled = false;
    const lookAheadMs = 25;
    const scheduleAheadTime = 0.1;
    const visualLeadTime = 1 / 120;

    const getAccentLevel = (step: number): AccentLevel => {
      const beatIndex = Math.floor(step / stepsPerBeat);

      if (step === 0) {
        return 'first';
      }

      return step % stepsPerBeat === 0 && accentedBeats.includes(beatIndex) ? 'normal' : 'none';
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
          setCurrentStepTime(nextStep.time);
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
      setCurrentStepTime(0);
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
  }, [playbackState, bpm, currentSound, beatsPerBar, stepsPerBeat, totalBeats, accentedBeats]);

  const togglePlay = () => {
    setPlaybackState((prev) => {
      if (prev === 'stopped') {
        return leadInEnabled ? 'lead-in' : 'playing';
      }

      return 'stopped';
    });
  };

  return {
    isPlaying: playbackState !== 'stopped',
    isLeadInActive: playbackState === 'lead-in',
    playbackState,
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
    beatsPerBar,
    meterLabel: selectedMeterPreset.label,
  };
};
