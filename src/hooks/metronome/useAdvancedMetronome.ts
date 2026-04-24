import { useState, useRef, useEffect } from 'react';
import { getMetronomeAccentForStep } from '../../utils/metronomeAccent';
import { metronomeAudio, type MetronomeSound } from '../../utils/metronomeAudio';
type PlaybackState = 'stopped' | 'lead-in' | 'playing';
export type BeatSource =
  | 'sounds'
  | 'vocal'
  | 'syllables'
  | 'tabla-bols'
  | 'guitar-strum'
  | 'piano-arpeggio'
  | 'violin-legato'
  | 'drums-pattern';
export type CountInMode = 'sounds' | 'voice';
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
  leadInEnabled = true,
  beatSource: BeatSource = 'sounds',
  countInMode: CountInMode = 'sounds'
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
  const scheduledStartTimeRef = useRef(0);

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
      scheduledStartTimeRef.current = 0;
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

      if (countInMode === 'voice') {
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

      const startWithCues = async () => {
        const audioContext = await metronomeAudio.resume();
        if (isCancelled) {
          return;
        }

        const secondsPerBeat = 60 / bpm;
        const cueStartTime = audioContext.currentTime + 0.08;
        scheduledStartTimeRef.current = cueStartTime + beatsPerBar * secondsPerBeat;

        countLabels.forEach((_, index) => {
          metronomeAudio.playCountInCueAt(index, cueStartTime + index * secondsPerBeat);
        });

        const timeoutIds = countLabels.map((_, index) =>
          window.setTimeout(() => {
            if (isCancelled) {
              return;
            }

            setLeadInCount(index + 1);
          }, index * millisecondsPerBeat)
        );

        const transitionLeadMs = Math.max(0, millisecondsPerBeat * beatsPerBar - 90);
        const startTimeoutId = window.setTimeout(() => {
          if (isCancelled) {
            return;
          }

          setLeadInCount(null);
          setPlaybackState('playing');
        }, transitionLeadMs);

        leadInTimeoutIdsRef.current = [...timeoutIds, startTimeoutId];
      };

      void startWithCues();

      return () => {
        isCancelled = true;
        leadInTimeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
        leadInTimeoutIdsRef.current = [];
      };
    }

    let isCancelled = false;
    const lookAheadMs = 25;
    const scheduleAheadTime = 0.1;
    const visualLeadTime = 1 / 120;

    const getAccentLevel = (step: number) =>
      getMetronomeAccentForStep(step, stepsPerBeat, beatsPerBar, accentedBeats);

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
        const subdivisionIndex = step % stepsPerBeat;

        const t = nextStepTimeRef.current;
        switch (beatSource) {
          case 'sounds':
            metronomeAudio.playSoundAt(currentSound, t, accentLevel);
            break;
          case 'vocal':
            metronomeAudio.playVocalBeatAt(t, accentLevel);
            break;
          case 'syllables':
            metronomeAudio.playSyllableBeatAt(t, accentLevel, subdivisionIndex, stepsPerBeat);
            break;
          case 'tabla-bols':
            metronomeAudio.playTablaBolAt(t, step % 4, accentLevel);
            break;
          case 'guitar-strum':
            metronomeAudio.playGuitarStrumAt(t, step % 2 === 0 ? 'down' : 'up', accentLevel);
            break;
          case 'piano-arpeggio':
            metronomeAudio.playPianoNoteAt(t, step % 4, accentLevel);
            break;
          case 'violin-legato':
            metronomeAudio.playViolinBowAt(t, accentLevel, secondsPerStep);
            break;
          case 'drums-pattern': {
            const grid16 = totalBeats > 0 ? Math.floor((step * 16) / totalBeats) % 16 : 0;
            metronomeAudio.playDrumPatternStepAt(t, grid16, accentLevel);
            break;
          }
          default:
            metronomeAudio.playSoundAt(currentSound, t, accentLevel);
        }
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
      nextStepTimeRef.current =
        scheduledStartTimeRef.current > audioContext.currentTime
          ? scheduledStartTimeRef.current
          : audioContext.currentTime + 0.05;
      scheduledStartTimeRef.current = 0;

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
  }, [
    playbackState,
    bpm,
    currentSound,
    beatsPerBar,
    stepsPerBeat,
    totalBeats,
    accentedBeats,
    beatSource,
    countInMode,
  ]);

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
