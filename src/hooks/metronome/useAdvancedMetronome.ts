import { useState, useRef, useEffect, useMemo } from 'react';
import {
  getGuitarPatternCellIndex,
  getGuitarStrumPattern,
  type GuitarStrumPatternId,
  type StrumToken,
} from '../../data/guitarStrumPatterns';
import { getMetronomeAccentForStep, VOICE_COUNT_IN_UTTERANCE_VOLUME } from '../../utils/metronomeAccent';
import { metronomeAudio, type MetronomeSound } from '../../utils/metronomeAudio';

export type { GuitarStrumPatternId, StrumToken } from '../../data/guitarStrumPatterns';
type PlaybackState = 'stopped' | 'lead-in' | 'playing';
export type BeatSource =
  | 'sounds'
  | 'vocal'
  | 'syllables'
  | 'tabla-bols'
  | 'guitar-strum'
  | 'reggae-one-drop'
  | 'reggae-steppers-8'
  | 'ska-offbeat-chank'
  | 'bossa-8'
  | 'salsa-montuno-8'
  | 'samba-partido-8'
  | 'piano-arpeggio'
  | 'violin-legato'
  | 'drums-pattern';

const GROOVE_BEAT_SOURCE_PATTERN_ID = {
  'reggae-one-drop': 'reggae-offbeat',
  'reggae-steppers-8': 'reggae-steppers-8',
  'ska-offbeat-chank': 'ska-chank',
  'bossa-8': 'bossa-nova-8',
  'salsa-montuno-8': 'montuno-8',
  'samba-partido-8': 'partido-samba-8',
} as const satisfies Record<string, GuitarStrumPatternId>;

type GrooveFixedBeatSource = keyof typeof GROOVE_BEAT_SOURCE_PATTERN_ID;

export function getGroovePatternIdForBeatSource(
  source: BeatSource,
): GuitarStrumPatternId | null {
  if (source in GROOVE_BEAT_SOURCE_PATTERN_ID) {
    return GROOVE_BEAT_SOURCE_PATTERN_ID[source as GrooveFixedBeatSource];
  }
  return null;
}

/** @deprecated use getGroovePatternIdForBeatSource */
export const getGuitarPatternIdForBeatSource = getGroovePatternIdForBeatSource;

export type StepAudioRole = 'rest' | 'ghost' | 'hit';

function computeStepAudioRoles(
  totalBeats: number,
  beatSource: BeatSource,
  guitarStrumPatternId: GuitarStrumPatternId,
): StepAudioRole[] {
  const grooveId = getGroovePatternIdForBeatSource(beatSource);
  const isGridPattern = beatSource === 'guitar-strum' || grooveId !== null;
  if (!isGridPattern) {
    return Array.from({ length: totalBeats }, () => 'hit' as const);
  }
  const patternId =
    beatSource === 'guitar-strum' ? guitarStrumPatternId : (grooveId ?? 'old-faithful');
  const gPat = getGuitarStrumPattern(patternId);
  return Array.from({ length: totalBeats }, (_, step) => {
    const gi = getGuitarPatternCellIndex(step, totalBeats, gPat.steps.length);
    const cell = gPat.steps[gi] ?? 'R';
    if (cell === 'R') {
      return 'rest';
    }
    if (cell === 'G') {
      return 'ghost';
    }
    return 'hit';
  });
}

function computeStepStrumTokens(
  totalBeats: number,
  beatSource: BeatSource,
  guitarStrumPatternId: GuitarStrumPatternId,
): StrumToken[] | undefined {
  const grooveId = getGroovePatternIdForBeatSource(beatSource);
  const isGridPattern = beatSource === 'guitar-strum' || grooveId !== null;
  if (!isGridPattern) {
    return undefined;
  }
  const patternId =
    beatSource === 'guitar-strum' ? guitarStrumPatternId : (grooveId ?? 'old-faithful');
  const gPat = getGuitarStrumPattern(patternId);
  return Array.from({ length: totalBeats }, (_, step) => {
    const gi = getGuitarPatternCellIndex(step, totalBeats, gPat.steps.length);
    return gPat.steps[gi] ?? 'R';
  });
}

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
  countInMode: CountInMode = 'sounds',
  guitarStrumPatternId: GuitarStrumPatternId = 'old-faithful',
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

  const stepAudioRoles = useMemo(
    () => computeStepAudioRoles(totalBeats, beatSource, guitarStrumPatternId),
    [totalBeats, beatSource, guitarStrumPatternId],
  );

  const stepStrumTokens = useMemo(
    () => computeStepStrumTokens(totalBeats, beatSource, guitarStrumPatternId),
    [totalBeats, beatSource, guitarStrumPatternId],
  );

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
          utterance.volume = VOICE_COUNT_IN_UTTERANCE_VOLUME;
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
          case 'guitar-strum': {
            const gPat = getGuitarStrumPattern(guitarStrumPatternId);
            const gi = getGuitarPatternCellIndex(step, totalBeats, gPat.steps.length);
            const cell = gPat.steps[gi] ?? 'R';
            metronomeAudio.playGuitarStrumStepAt(t, cell, accentLevel);
            break;
          }
          case 'reggae-one-drop':
          case 'reggae-steppers-8':
          case 'ska-offbeat-chank':
          case 'bossa-8':
          case 'salsa-montuno-8':
          case 'samba-partido-8': {
            const patternId = getGroovePatternIdForBeatSource(beatSource) ?? 'old-faithful';
            const gPat = getGuitarStrumPattern(patternId);
            const gi = getGuitarPatternCellIndex(step, totalBeats, gPat.steps.length);
            const cell = gPat.steps[gi] ?? 'R';
            switch (beatSource) {
              case 'reggae-one-drop':
              case 'reggae-steppers-8':
                metronomeAudio.playReggaeOneDropStepAt(t, cell, accentLevel);
                break;
              case 'ska-offbeat-chank':
                metronomeAudio.playSkaChankStepAt(t, cell, accentLevel);
                break;
              case 'bossa-8':
                metronomeAudio.playBossaNylonStepAt(t, cell, accentLevel);
                break;
              case 'salsa-montuno-8':
                metronomeAudio.playSalsaMontunoPianoStepAt(t, cell, accentLevel);
                break;
              case 'samba-partido-8':
                metronomeAudio.playSambaPartidoStepAt(t, cell, accentLevel);
                break;
            }
            break;
          }
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
    guitarStrumPatternId,
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
    stepAudioRoles,
    stepStrumTokens,
  };
};
