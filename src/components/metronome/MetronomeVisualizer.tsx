import { useEffect, useRef } from 'react';
import type { StepAudioRole } from '../../hooks/metronome/useAdvancedMetronome';
import type { StrumToken } from '../../data/guitarStrumPatterns';
import { metronomeAudio } from '../../utils/metronomeAudio';

export type VisualizerMode = 'tracker' | 'pendulum' | 'bouncing-ball';

interface MetronomeVisualizerProps {
  mode: VisualizerMode;
  isActive: boolean;
  beatCount: number;
  stepsPerBeat: number;
  totalBeats: number;
  currentStepTime: number;
  secondsPerStep: number;
  /** Per-step pattern from D/U/G/R grid (strum / groove); omitted = all steps "hit". */
  stepAudioRoles?: readonly StepAudioRole[];
  /** Full D/U/G/R for strum + groove; when set, D/U use --metro-pulse-down / --metro-pulse-up. */
  stepStrumTokens?: readonly StrumToken[];
}

const roundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
};

export const MetronomeVisualizer = ({
  mode,
  isActive,
  beatCount,
  stepsPerBeat,
  totalBeats,
  currentStepTime,
  secondsPerStep,
  stepAudioRoles,
  stepStrumTokens,
}: MetronomeVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const withAlpha = (color: string, alpha: number) => {
    const normalized = color.trim();
    if (!normalized) {
      return `rgba(255, 255, 255, ${alpha})`;
    }

    if (normalized.startsWith('rgba(')) {
      return normalized.replace(/rgba\(([^)]+),\s*[^)]+\)/, `rgba($1, ${alpha})`);
    }

    if (normalized.startsWith('rgb(')) {
      return normalized.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    }

    return normalized;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const parent = canvas.parentElement;
    if (!parent) {
      return;
    }

    let animationFrameId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const draw = () => {
      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      const bounds = canvas.getBoundingClientRect();
      const width = bounds.width;
      const height = bounds.height;
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      const themeStyles = getComputedStyle(canvas);
      const visualizerBg =
        themeStyles.getPropertyValue('--metro-visualizer-bg').trim() || 'rgba(15, 23, 42, 0.68)';
      const visualizerTrack =
        themeStyles.getPropertyValue('--metro-visualizer-track').trim() || 'rgba(148, 163, 184, 0.45)';
      const visualizerArm =
        themeStyles.getPropertyValue('--metro-visualizer-arm').trim() || 'rgba(226, 232, 240, 0.85)';
      const accentBase =
        themeStyles.getPropertyValue('--app-accent').trim() || 'rgb(248, 113, 113)';
      const accentStrong =
        themeStyles.getPropertyValue('--app-accent-strong').trim() || 'rgb(96, 165, 250)';
      const iconColor =
        themeStyles.getPropertyValue('--app-icon-color').trim() || 'rgb(196, 181, 253)';
      const mutedStrong =
        themeStyles.getPropertyValue('--app-muted-strong').trim() || 'rgb(52, 211, 153)';
      const metroPulseDown =
        themeStyles.getPropertyValue('--metro-pulse-down').trim() || 'rgba(199, 210, 254, 0.94)';
      const metroPulseUp =
        themeStyles.getPropertyValue('--metro-pulse-up').trim() || 'rgb(248, 113, 113)';

      const themedBeatPalette = [
        {
          active: withAlpha(accentBase, 0.84),
          idle: withAlpha(accentBase, 0.24),
        },
        {
          active: withAlpha(accentStrong, 0.8),
          idle: withAlpha(accentStrong, 0.2),
        },
        {
          active: withAlpha(iconColor, 0.78),
          idle: withAlpha(iconColor, 0.22),
        },
        {
          active: withAlpha(mutedStrong, 0.76),
          idle: withAlpha(mutedStrong, 0.2),
        },
      ] as const;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      const audioContext = metronomeAudio.peekContext();
      const audioTime = audioContext?.currentTime ?? 0;
      const rawProgress =
        isActive && currentStepTime > 0 && secondsPerStep > 0
          ? (audioTime - currentStepTime) / secondsPerStep
          : 0;
      const stepProgress = Math.max(0, Math.min(1, rawProgress));
      const continuousStep = beatCount + stepProgress;
      const quarterMode = totalBeats <= 4;
      const activeBeatIndex = Math.floor(beatCount / stepsPerBeat) % themedBeatPalette.length;

      const patternRoles =
        stepAudioRoles && stepAudioRoles.length === totalBeats ? stepAudioRoles : null;
      const strumGrid =
        stepStrumTokens && stepStrumTokens.length === totalBeats ? stepStrumTokens : null;
      const stepRole = (index: number): StepAudioRole =>
        patternRoles?.[index] ?? 'hit';

      const getBeatColor = (index: number, isActiveBeat: boolean, isSubdivision: boolean) => {
        const paletteIndex = Math.floor(index / stepsPerBeat) % themedBeatPalette.length;
        const palette = themedBeatPalette[paletteIndex];

        if (isSubdivision) {
          return isActiveBeat
            ? `rgba(148, 163, 184, ${0.45 + 0.18 * (1 - stepProgress)})`
            : 'rgba(71, 85, 105, 0.36)';
        }

        if (isActiveBeat) {
          const a = 0.6 + 0.34 * (1 - stepProgress);
          return palette.active.includes('%alpha%')
            ? palette.active.replace('%alpha%', String(a))
            : palette.active;
        }

        return palette.idle;
      };

      context.fillStyle = visualizerBg;
      roundedRect(context, 0, 0, width, height, 20);
      context.fill();

      if (mode === 'tracker') {
        const paddingX = 18;
        const gap = quarterMode ? 14 : totalBeats <= 8 ? 9 : 6;
        const segmentWidth = (width - paddingX * 2 - gap * (totalBeats - 1)) / totalBeats;
        const segmentHeight = quarterMode ? 28 : totalBeats <= 8 ? 18 : 12;
        const baseY = (height - segmentHeight) / 2;

        for (let index = 0; index < totalBeats; index += 1) {
          const x = paddingX + index * (segmentWidth + gap);
          const isMainBeat = index % stepsPerBeat === 0;
          const isActiveBeat = index === beatCount && isActive;
          const isSubdivision = !isMainBeat;
          const role = stepRole(index);
          const strumT = strumGrid?.[index] ?? null;
          const isRest = strumT ? strumT === 'R' : role === 'rest';
          const isGhost = strumT ? strumT === 'G' : role === 'ghost';
          const lift =
            isActiveBeat && !isRest
              ? (quarterMode ? 10 : 8) * (1 - stepProgress)
              : isActiveBeat && isRest
                ? 3 * (1 - stepProgress)
                : 0;

          if (strumT === 'D' || strumT === 'U') {
            const base = strumT === 'D' ? metroPulseDown : metroPulseUp;
            const idleA = strumT === 'D' ? 0.48 : 0.4;
            context.fillStyle = isActiveBeat
              ? withAlpha(base, 0.6 + 0.38 * (1 - stepProgress))
              : withAlpha(base, idleA);
            roundedRect(
              context,
              x,
              baseY - lift,
              segmentWidth,
              segmentHeight + lift,
              segmentHeight / 2,
            );
            context.fill();
          } else if (isRest) {
            context.fillStyle = isActiveBeat
              ? `rgba(30, 41, 59, ${0.38 + 0.2 * (1 - stepProgress)})`
              : 'rgba(15, 23, 42, 0.2)';
            roundedRect(
              context,
              x,
              baseY - lift,
              segmentWidth,
              segmentHeight + lift,
              segmentHeight / 2,
            );
            context.fill();
            if (isActiveBeat) {
              context.strokeStyle = `rgba(148, 163, 184, ${0.35 + 0.35 * (1 - stepProgress)})`;
              context.lineWidth = 1.5;
              roundedRect(
                context,
                x,
                baseY - lift,
                segmentWidth,
                segmentHeight + lift,
                segmentHeight / 2,
              );
              context.stroke();
            }
          } else if (isGhost) {
            context.fillStyle = isActiveBeat
              ? withAlpha(mutedStrong, 0.48 + 0.28 * (1 - stepProgress))
              : withAlpha(mutedStrong, 0.2);
            roundedRect(
              context,
              x,
              baseY - lift,
              segmentWidth,
              segmentHeight + lift,
              segmentHeight / 2,
            );
            context.fill();
          } else {
            context.fillStyle = getBeatColor(index, isActiveBeat, isSubdivision);
            roundedRect(
              context,
              x,
              baseY - lift,
              segmentWidth,
              segmentHeight + lift,
              segmentHeight / 2,
            );
            context.fill();
          }
        }
      }

      if (mode === 'pendulum') {
        const centerX = width / 2;
        const topY = 22;
        const armLength = Math.min(height * 0.58, width * 0.24);
        const beatPhase = continuousStep / stepsPerBeat;
        const angle = Math.cos(beatPhase * Math.PI) * (Math.PI / 5.5);
        const bobX = centerX + Math.sin(angle) * armLength;
        const bobY = topY + Math.cos(angle) * armLength;
        const palette = themedBeatPalette[activeBeatIndex];
        const pendulumStep =
          totalBeats > 0 ? ((beatCount % totalBeats) + totalBeats) % totalBeats : 0;
        const pStrum = strumGrid?.[pendulumStep] ?? null;
        const pRole = stepRole(pendulumStep);
        const bobFill = pStrum
          ? pStrum === 'D'
            ? withAlpha(metroPulseDown, 0.92)
            : pStrum === 'U'
              ? withAlpha(metroPulseUp, 0.92)
              : pStrum === 'G'
                ? withAlpha(mutedStrong, 0.88)
                : 'rgba(100, 116, 139, 0.55)'
          : pRole === 'rest'
            ? 'rgba(100, 116, 139, 0.55)'
            : pRole === 'ghost'
              ? withAlpha(mutedStrong, 0.88)
              : palette.active.includes('%alpha%')
                ? palette.active.replace('%alpha%', '0.92')
                : palette.active;

        context.strokeStyle = visualizerTrack;
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(centerX, topY);
        context.lineTo(centerX, height - 18);
        context.stroke();

        context.strokeStyle = visualizerArm;
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(centerX, topY);
        context.lineTo(bobX, bobY);
        context.stroke();

        context.fillStyle = bobFill;
        context.beginPath();
        context.arc(bobX, bobY, 12, 0, Math.PI * 2);
        context.fill();
      }

      if (mode === 'bouncing-ball') {
        const paddingX = 28;
        const baselineY = height - 26;
        const span = width - paddingX * 2;
        const barProgress = totalBeats > 1 ? continuousStep / (totalBeats - 1) : 0;
        const x = paddingX + Math.max(0, Math.min(1, barProgress)) * span;
        const bounce = 1 - 4 * Math.pow(stepProgress - 0.5, 2);
        const y = baselineY - Math.max(0, bounce) * (height * 0.48);
        const palette = themedBeatPalette[activeBeatIndex];
        const bounceStep =
          totalBeats > 0
            ? ((Math.floor(continuousStep) % totalBeats) + totalBeats) % totalBeats
            : 0;
        const bStrum = strumGrid?.[bounceStep] ?? null;
        const bRole = stepRole(bounceStep);
        const ballFill = bStrum
          ? bStrum === 'D'
            ? withAlpha(metroPulseDown, 0.94)
            : bStrum === 'U'
              ? withAlpha(metroPulseUp, 0.94)
              : bStrum === 'G'
                ? withAlpha(mutedStrong, 0.9)
                : 'rgba(100, 116, 139, 0.55)'
          : bRole === 'rest'
            ? 'rgba(100, 116, 139, 0.55)'
            : bRole === 'ghost'
              ? withAlpha(mutedStrong, 0.9)
              : palette.active.includes('%alpha%')
                ? palette.active.replace('%alpha%', '0.94')
                : palette.active;

        context.strokeStyle = visualizerTrack;
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(paddingX, baselineY);
        context.lineTo(width - paddingX, baselineY);
        context.stroke();

        context.fillStyle = ballFill;
        context.beginPath();
        context.arc(x, y, 12, 0, Math.PI * 2);
        context.fill();
      }

      animationFrameId = window.requestAnimationFrame(draw);
    };

    resizeObserver = new ResizeObserver(() => {
      const bounds = parent.getBoundingClientRect();
      canvas.style.width = `${bounds.width}px`;
      canvas.style.height = '132px';
    });

    resizeObserver.observe(parent);
    const initialBounds = parent.getBoundingClientRect();
    canvas.style.width = `${initialBounds.width}px`;
    canvas.style.height = '132px';

    draw();

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      resizeObserver?.disconnect();
    };
  }, [
    beatCount,
    currentStepTime,
    isActive,
    mode,
    secondsPerStep,
    stepAudioRoles,
    stepStrumTokens,
    stepsPerBeat,
    totalBeats,
  ]);

  return <canvas ref={canvasRef} className="w-full h-[132px] rounded-2xl" aria-hidden="true" />;
};