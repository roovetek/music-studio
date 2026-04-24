import { useEffect, useRef } from 'react';
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

const beatPalette = [
  {
    active: 'rgba(248, 113, 113, %alpha%)',
    idle: 'rgba(248, 113, 113, 0.24)',
  },
  {
    active: 'rgba(96, 165, 250, %alpha%)',
    idle: 'rgba(96, 165, 250, 0.22)',
  },
  {
    active: 'rgba(52, 211, 153, %alpha%)',
    idle: 'rgba(52, 211, 153, 0.22)',
  },
  {
    active: 'rgba(196, 181, 253, %alpha%)',
    idle: 'rgba(196, 181, 253, 0.22)',
  },
] as const;

export const MetronomeVisualizer = ({
  mode,
  isActive,
  beatCount,
  stepsPerBeat,
  totalBeats,
  currentStepTime,
  secondsPerStep,
}: MetronomeVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      const activeBeatIndex = Math.floor(beatCount / stepsPerBeat) % beatPalette.length;

      const getBeatColor = (index: number, isActiveBeat: boolean, isSubdivision: boolean) => {
        const paletteIndex = Math.floor(index / stepsPerBeat) % beatPalette.length;
        const palette = beatPalette[paletteIndex];

        if (isSubdivision) {
          return isActiveBeat
            ? `rgba(148, 163, 184, ${0.45 + 0.18 * (1 - stepProgress)})`
            : 'rgba(71, 85, 105, 0.36)';
        }

        if (isActiveBeat) {
          return palette.active.replace('%alpha%', String(0.6 + 0.34 * (1 - stepProgress)));
        }

        return palette.idle;
      };

      context.fillStyle = 'rgba(15, 23, 42, 0.68)';
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
          const lift = isActiveBeat ? (quarterMode ? 10 : 8) * (1 - stepProgress) : 0;

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

      if (mode === 'pendulum') {
        const centerX = width / 2;
        const topY = 22;
        const armLength = Math.min(height * 0.58, width * 0.24);
        const beatPhase = continuousStep / stepsPerBeat;
        const angle = Math.cos(beatPhase * Math.PI) * (Math.PI / 5.5);
        const bobX = centerX + Math.sin(angle) * armLength;
        const bobY = topY + Math.cos(angle) * armLength;
        const palette = beatPalette[activeBeatIndex];

        context.strokeStyle = 'rgba(148, 163, 184, 0.55)';
        context.lineWidth = 4;
        context.beginPath();
        context.moveTo(centerX, topY);
        context.lineTo(centerX, height - 18);
        context.stroke();

        context.strokeStyle = 'rgba(226, 232, 240, 0.85)';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(centerX, topY);
        context.lineTo(bobX, bobY);
        context.stroke();

        context.fillStyle = palette.active.replace('%alpha%', '0.92');
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
        const palette = beatPalette[activeBeatIndex];

        context.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(paddingX, baselineY);
        context.lineTo(width - paddingX, baselineY);
        context.stroke();

        context.fillStyle = palette.active.replace('%alpha%', '0.94');
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
  }, [beatCount, currentStepTime, isActive, mode, secondsPerStep, stepsPerBeat, totalBeats]);

  return <canvas ref={canvasRef} className="w-full h-[132px] rounded-2xl" aria-hidden="true" />;
};