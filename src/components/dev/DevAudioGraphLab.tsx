import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  BookOpen,
  Cable,
  HelpCircle,
  Pause,
  Play,
  Radio,
  Wand2,
} from 'lucide-react';
import { soundOptions, type MetronomeSound, soundOutputTrim } from '../../utils/metronome/catalog';
import { playKitBySoundId } from '../../utils/metronome/kit';
import { playTablaBolAt, TABLA_BOL_GAIN } from '../../utils/metronome/patternSynth';
import {
  connectKitThroughTrim,
  connectPatternBus,
  createMasterGain,
  METRONOME_MASTER_GAIN,
  PATTERN_BUS_TRIM,
} from '../../utils/metronome/metronomeOutputGraph';
import { maxAbsSample, shortWindowRmsAfterPeak } from '../../utils/metronome/loudnessMetrics';
import type { MetronomeAccent } from '../../utils/metronomeAccent';
import {
  kitGraphSummaries,
  LOUDNESS_NOTES,
  OUTPUT_BUS_SCHEMATIC,
} from '../../data/devAudioGraphManifest';

const ACCENT_OPTIONS: MetronomeAccent[] = ['first', 'normal', 'none'];

const BOL_OPTIONS = [
  { index: 0, name: 'ta' },
  { index: 1, name: 'dhin' },
  { index: 2, name: 'dhin' },
  { index: 3, name: 'na' },
] as const;

const CAPTURE_WINDOW_MS = 500;

type PathKind = 'kit' | 'tabla';

type DevAudioGraphLabProps = { onBack: () => void };

type AnalyserFloatArray = Parameters<AnalyserNode['getFloatTimeDomainData']>[0];
type AnalyserByteArray = Parameters<AnalyserNode['getByteFrequencyData']>[0];

type OneShotSnapshot = {
  time: AnalyserFloatArray;
  freq: AnalyserByteArray;
  peak: number;
  rms12: number;
  atMs: number;
  sampleRate: number;
};

type CaptureState = {
  endAt: number;
  bestPeak: number;
  bestTime: AnalyserFloatArray | null;
  bestFreq: AnalyserByteArray | null;
};

function floatRms12AroundPeak(
  d: ArrayLike<number>,
  sampleRate: number,
  windowMs = 12,
): number {
  let maxI = 0;
  let maxA = 0;
  for (let i = 0; i < d.length; i += 1) {
    const a = Math.abs(d[i]!);
    if (a > maxA) {
      maxA = a;
      maxI = i;
    }
  }
  const len = (windowMs / 1000) * sampleRate;
  const start = maxI - len * 0.5;
  const s0 = Math.max(0, Math.floor(start));
  const n = Math.min(Math.floor(len), d.length - s0);
  if (n <= 0) {
    return 0;
  }
  let acc = 0;
  for (let i = 0; i < n; i += 1) {
    const v = d[s0 + i]!;
    acc += v * v;
  }
  return Math.sqrt(acc / n);
}

function drawTimeDomain(
  ctx: CanvasRenderingContext2D,
  data: ArrayLike<number>,
  w: number,
  h: number,
) {
  ctx.fillStyle = 'rgba(12, 14, 20, 0.95)';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.9)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  const mid = h * 0.5;
  for (let i = 0; i < w; i += 1) {
    const j = Math.floor((i / w) * data.length);
    const v = data[j] ?? 0;
    const y = mid + (v * mid * 0.9);
    if (i === 0) {
      ctx.moveTo(i, y);
    } else {
      ctx.lineTo(i, y);
    }
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(w, mid);
  ctx.stroke();
}

function drawFrequency(
  ctx: CanvasRenderingContext2D,
  data: ArrayLike<number>,
  w: number,
  h: number,
) {
  ctx.fillStyle = 'rgba(12, 14, 20, 0.95)';
  ctx.fillRect(0, 0, w, h);
  const n = data.length;
  const barW = w / n;
  for (let i = 0; i < n; i += 1) {
    const v = data[i]! / 255;
    const bh = v * h * 0.95;
    const x = i * barW;
    const g = 80 + i * 0.3;
    ctx.fillStyle = `hsla(${g}, 50%, 55%, ${0.2 + v * 0.75})`;
    ctx.fillRect(x, h - bh, Math.max(1, barW - 0.2), bh);
  }
}

function GlossaryItem({
  title,
  id,
  openId,
  setOpen,
  children,
}: {
  title: string;
  id: string;
  openId: string | null;
  setOpen: (id: string | null) => void;
  children: ReactNode;
}) {
  const open = openId === id;
  return (
    <div className="rounded-lg border border-stone-200/80 dark:border-zinc-600/80">
      <button
        type="button"
        onClick={() => setOpen(open ? null : id)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-stone-800 dark:text-zinc-100"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 shrink-0 text-sky-500" />
          {title}
        </span>
        <span className="text-xs text-stone-400">{open ? 'Hide' : 'What is this?'}</span>
      </button>
      {open ? <div className="border-t border-stone-200/80 px-3 pb-3 pt-0 text-sm text-stone-600 dark:border-zinc-600/60 dark:text-zinc-300">{children}</div> : null}
    </div>
  );
}

export function DevAudioGraphLab({ onBack }: DevAudioGraphLabProps) {
  const [path, setPath] = useState<PathKind>('kit');
  const [sound, setSound] = useState<MetronomeSound>('woodblock');
  const [accent, setAccent] = useState<MetronomeAccent>('normal');
  const [bolIndex, setBolIndex] = useState(0);
  const [framePeak, setFramePeak] = useState(0);
  const [lastOfflinePeak, setLastOfflinePeak] = useState<number | null>(null);
  const [lastRms12, setLastRms12] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  const [oneShot, setOneShot] = useState<OneShotSnapshot | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState<string | null>(null);
  const [flowStep, setFlowStep] = useState(0);
  const [capturePulse, setCapturePulse] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [loopIntervalMs, setLoopIntervalMs] = useState(500);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const timeCanvasRef = useRef<HTMLCanvasElement>(null);
  const freqCanvasRef = useRef<HTMLCanvasElement>(null);
  const snapTimeCanvasRef = useRef<HTMLCanvasElement>(null);
  const snapFreqCanvasRef = useRef<HTMLCanvasElement>(null);
  const timeDataRef = useRef<AnalyserFloatArray | null>(null);
  const freqDataRef = useRef<AnalyserByteArray | null>(null);
  const captureRef = useRef<CaptureState | null>(null);
  const committedRef = useRef(true);

  const ensureGraph = useCallback(() => {
    if (ctxRef.current && analyserRef.current && masterGainRef.current) {
      return { ctx: ctxRef.current, master: masterGainRef.current, analyser: analyserRef.current };
    }
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      throw new Error('Web Audio not available');
    }
    const ctx = new Ctor();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.4;
    analyser.minDecibels = -95;
    analyser.maxDecibels = -5;
    const master = createMasterGain(ctx, analyser);
    masterGainRef.current = master;
    analyser.connect(ctx.destination);
    ctxRef.current = ctx;
    analyserRef.current = analyser;
    return { ctx, master, analyser };
  }, []);

  const drawSnapshotToRefs = useCallback((snap: OneShotSnapshot | null) => {
    if (!snap) {
      return;
    }
    const tc = snapTimeCanvasRef.current?.getContext('2d');
    const fc = snapFreqCanvasRef.current?.getContext('2d');
    if (tc) {
      drawTimeDomain(tc, snap.time, tc.canvas.width, tc.canvas.height);
    }
    if (fc) {
      drawFrequency(fc, snap.freq, fc.canvas.width, fc.canvas.height);
    }
  }, []);

  const startViz = useCallback(() => {
    const a = analyserRef.current;
    if (!a) {
      return;
    }
    if (!timeDataRef.current) {
      timeDataRef.current = new Float32Array(a.fftSize) as AnalyserFloatArray;
    }
    if (!freqDataRef.current) {
      freqDataRef.current = new Uint8Array(a.frequencyBinCount) as AnalyserByteArray;
    }

    const tick = () => {
      const at = timeDataRef.current!;
      const af = freqDataRef.current!;
      a.getFloatTimeDomainData(at);
      a.getByteFrequencyData(af);
      let m = 0;
      for (let i = 0; i < at.length; i += 1) {
        m = Math.max(m, Math.abs(at[i]!));
      }
      setFramePeak(m);
      const tc = timeCanvasRef.current?.getContext('2d');
      const fc = freqCanvasRef.current?.getContext('2d');
      if (tc) {
        drawTimeDomain(tc, at, tc.canvas.width, tc.canvas.height);
      }
      if (fc) {
        drawFrequency(fc, af, fc.canvas.width, fc.canvas.height);
      }

      const now = performance.now();
      if (captureRef.current) {
        const c = captureRef.current;
        if (now < c.endAt) {
          if (m > c.bestPeak) {
            c.bestPeak = m;
            c.bestTime = new Float32Array(at) as AnalyserFloatArray;
            c.bestFreq = new Uint8Array(af) as AnalyserByteArray;
          }
        } else if (!committedRef.current) {
          committedRef.current = true;
          const sr = ctxRef.current?.sampleRate ?? 48000;
          if (c.bestTime && c.bestFreq && c.bestPeak > 1e-8) {
            const r = floatRms12AroundPeak(c.bestTime, sr);
            setOneShot({
              time: c.bestTime,
              freq: c.bestFreq,
              peak: c.bestPeak,
              rms12: r,
              atMs: Date.now(),
              sampleRate: sr,
            });
            setCapturePulse((p) => p + 1);
          }
          captureRef.current = null;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const fitAllCanvases = useCallback(() => {
    const fit = (canvas: HTMLCanvasElement | null) => {
      if (!canvas) {
        return;
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.floor(canvas.clientWidth * dpr) || 800;
      const h = Math.floor(128 * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    fit(timeCanvasRef.current);
    fit(freqCanvasRef.current);
    fit(snapTimeCanvasRef.current);
    fit(snapFreqCanvasRef.current);
  }, []);

  useLayoutEffect(() => {
    fitAllCanvases();
  });

  useLayoutEffect(() => {
    drawSnapshotToRefs(oneShot);
  }, [oneShot, drawSnapshotToRefs, capturePulse]);

  useEffect(() => {
    function onResize() {
      fitAllCanvases();
      drawSnapshotToRefs(oneShot);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fitAllCanvases, drawSnapshotToRefs, oneShot]);

  useEffect(() => {
    ensureGraph();
    startViz();
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [ensureGraph, startViz]);

  useEffect(() => {
    if (analyserRef.current) {
      analyserRef.current.smoothingTimeConstant = isLooping ? 0.32 : 0.4;
    }
  }, [isLooping]);

  const fireClick = useCallback(
    async (opts: { withCapture: boolean; updateStatus: boolean; solo?: boolean }) => {
      if (opts.updateStatus) {
        setStatus('');
      }
      const solo = opts.solo === true;
      try {
        const { ctx, master } = ensureGraph();
        await ctx.resume();
        const t = ctx.currentTime + 0.05;

        if (opts.withCapture) {
          const endAt = performance.now() + CAPTURE_WINDOW_MS;
          committedRef.current = false;
          captureRef.current = {
            endAt,
            bestPeak: 0,
            bestTime: null,
            bestFreq: null,
          };
          if (analyserRef.current) {
            analyserRef.current.smoothingTimeConstant = 0.05;
            window.setTimeout(() => {
              if (analyserRef.current) {
                analyserRef.current.smoothingTimeConstant = isLooping ? 0.32 : 0.4;
              }
            }, CAPTURE_WINDOW_MS + 100);
          }
        }

        if (path === 'kit') {
          playKitBySoundId(sound, ctx, t, accent, (soundId, g) => {
            connectKitThroughTrim(ctx, g, soundOutputTrim[soundId], master);
          });
        } else {
          playTablaBolAt(ctx, t, bolIndex, accent, (g) => {
            connectPatternBus(ctx, g, master);
          });
        }
        if (opts.updateStatus) {
          if (isLooping && !solo) {
            setStatus(
              `Pulsing every ${loopIntervalMs}ms (~${(60000 / loopIntervalMs).toFixed(0)} BPM pulse) · ` +
                (path === 'kit'
                  ? `Kit ${sound} · ${accent} · trim ${soundOutputTrim[sound].toFixed(3)}`
                  : `Tabla bol ${bolIndex} · ${accent}`) +
                ` → master ${METRONOME_MASTER_GAIN}`,
            );
          } else {
            if (path === 'kit') {
              setStatus(
                `Kit: ${sound} · ${accent} · trim ${soundOutputTrim[sound].toFixed(3)} → master ${METRONOME_MASTER_GAIN}`,
              );
            } else {
              setStatus(
                `Tabla bol ${bolIndex} (${BOL_OPTIONS[bolIndex]!.name}) · ${accent} · TABLA_BOL_GAIN ${TABLA_BOL_GAIN} · PATTERN trim ${PATTERN_BUS_TRIM} → master ${METRONOME_MASTER_GAIN}`,
              );
            }
          }
        }
      } catch (e) {
        if (opts.updateStatus) {
          setStatus(e instanceof Error ? e.message : 'Playback error');
        }
      }
    },
    [accent, bolIndex, ensureGraph, isLooping, loopIntervalMs, path, sound],
  );

  useEffect(() => {
    if (!isLooping) {
      return;
    }
    const tick = () => {
      void fireClick({ withCapture: false, updateStatus: false, solo: false });
    };
    void fireClick({ withCapture: false, updateStatus: true, solo: false });
    const id = window.setInterval(tick, loopIntervalMs);
    return () => {
      clearInterval(id);
    };
  }, [isLooping, loopIntervalMs, fireClick]);

  const playSingle = useCallback(() => {
    void fireClick({ withCapture: true, updateStatus: true, solo: true });
  }, [fireClick]);

  const clearHeld = useCallback(() => {
    setOneShot(null);
    if (snapTimeCanvasRef.current) {
      const c = snapTimeCanvasRef.current.getContext('2d');
      if (c) {
        c.clearRect(0, 0, c.canvas.width, c.canvas.height);
      }
    }
    if (snapFreqCanvasRef.current) {
      const c = snapFreqCanvasRef.current.getContext('2d');
      if (c) {
        c.clearRect(0, 0, c.canvas.width, c.canvas.height);
      }
    }
  }, []);

  const measureLikeCalibrate = useCallback(() => {
    const OAC = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    if (!OAC) {
      setStatus('No OfflineAudioContext in this browser — metrics disabled.');
      setLastOfflinePeak(null);
      setLastRms12(null);
      return;
    }
    const sampleRate = 48000;
    const sec = 0.55;
    const off = new OAC(1, Math.ceil(sampleRate * sec), sampleRate) as OfflineAudioContext;
    const offlineAsLive = off as unknown as AudioContext;
    const master = createMasterGain(off, off.destination);
    if (path === 'kit') {
      playKitBySoundId(sound, offlineAsLive, 0, accent, (id, g) => {
        connectKitThroughTrim(off, g, soundOutputTrim[id], master);
      });
    } else {
      playTablaBolAt(offlineAsLive, 0, bolIndex, accent, (g) => {
        connectPatternBus(off, g, master);
      });
    }
    off
      .startRendering()
      .then((buf) => {
        setLastOfflinePeak(maxAbsSample(buf));
        setLastRms12(shortWindowRmsAfterPeak(buf));
        setStatus('Offline buffer: full render peak + 12ms RMS (calibration script, no FFT).');
      })
      .catch(() => setStatus('Offline render failed.'));
  }, [accent, bolIndex, path, sound]);

  const summary = path === 'kit' ? kitGraphSummaries[sound] : null;

  const flowSteps = [
    { t: 'Pick bus', d: 'Kit = catalog click sounds. Tabla = groove pattern engine (one bol).' },
    { t: 'Choose voice', d: 'Any kit option or a tabla bol. Accent shapes velocity.' },
    { t: 'Start pulsing', d: 'Repeating clicks keep the Analyser fed — you can read the live FFT spectrum in motion. Adjust the interval (or BPM) so clicks do not smear into each other.' },
    { t: 'Single / Held', d: '“Single (hold capture)” = one click + the frozen strip. Optional while the pulse is running.' },
    { t: 'Measure (optional)', d: 'Full offline buffer — same numbers as the dev cal script.' },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 text-left">
      <button
        type="button"
        onClick={onBack}
        className="theme-back-link mb-6 transition-colors"
      >
        Back to home
      </button>

      <h1 className="mb-2 text-2xl font-bold tracking-tight">Audio graph lab (dev)</h1>
      <p className="mb-4 text-sm text-stone-500 dark:text-zinc-400">
        <strong>Start pulsing</strong> runs the same click on a loop so the <strong>live spectrum and waveform</strong> keep
        moving. <strong>Single (hold)</strong> is for one fire + the frozen <strong>Held</strong> strip. Same Web Audio path
        as the metronome.
      </p>

      {/* Guided flow */}
      <div className="mb-6 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 dark:border-sky-400/20 dark:bg-sky-950/30">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-sky-800 dark:text-sky-200">
          <Wand2 className="h-4 w-4" />
          Quick path (click a step for detail)
        </h2>
        <div className="mb-2 flex flex-wrap items-stretch gap-1 md:gap-0">
          {flowSteps.map((s, i) => (
            <div key={s.t} className="flex min-w-0 items-center">
              <button
                type="button"
                onClick={() => setFlowStep(i)}
                className={`group flex min-w-0 flex-col rounded-lg border px-2.5 py-2 text-left text-xs transition-all md:px-3 ${
                  flowStep === i
                    ? 'border-sky-500 bg-sky-500/15 ring-1 ring-sky-500/50'
                    : 'border-stone-200/80 bg-white/50 hover:border-sky-300 dark:border-zinc-600 dark:bg-zinc-900/40'
                }`}
              >
                <span className="mb-0.5 font-mono text-[10px] text-stone-400">0{i + 1}</span>
                <span className="font-semibold text-stone-800 dark:text-zinc-100">{s.t}</span>
              </button>
              {i < flowSteps.length - 1 ? (
                <span className="hidden px-1 text-stone-300 md:inline" aria-hidden>
                  →
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <p className="text-sm text-stone-600 dark:text-zinc-300">
          {flowSteps[flowStep]!.d}
        </p>
      </div>

      {/* Glossary: click to learn */}
      <div className="mb-6 space-y-2">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">Click to understand</h2>
        <GlossaryItem
          id="live"
          title="Live (moving) scope"
          openId={glossaryOpen}
          setOpen={setGlossaryOpen}
        >
          The two top canvases show what the <code>AnalyserNode</code> sees <strong>right now</strong>. With{' '}
          <strong>Start pulsing</strong> on, you get a steady train of clicks, so the <strong>spectrum</strong> lights up
          on each hit and the picture keeps updating. If nothing is running, the line is near flat (silence).
        </GlossaryItem>
        <GlossaryItem
          id="held"
          title="Held (one-shot) capture"
          openId={glossaryOpen}
          setOpen={setGlossaryOpen}
        >
          After <strong>Single (hold capture)</strong>, for {CAPTURE_WINDOW_MS}ms the lab keeps the
          <strong> loudest</strong> analyser frame and copies it to the <strong>Held</strong> row. (Continuous
          pulsing does not auto-update Held — use <strong>Single</strong> when you want a freeze frame.)
        </GlossaryItem>
        <GlossaryItem
          id="compare"
          title="Live vs held vs Measure"
          openId={glossaryOpen}
          setOpen={setGlossaryOpen}
        >
          <strong>Held</strong> peak/RMS is computed on the <strong>same short buffer</strong> the browser uses for
          the scope (convenient, can differ from offline). <strong>Measure</strong> renders a full
          <code>OfflineAudioContext</code> buffer (longer) and uses the same <code>maxAbsSample</code> and{' '}
          <code>shortWindowRmsAfterPeak</code> as <code>npm run calibrate-metronome</code> (no FFT).
        </GlossaryItem>
        <GlossaryItem
          id="fft"
          title="Why the spectrum wiggles (FFT)"
          openId={glossaryOpen}
          setOpen={setGlossaryOpen}
        >
          <code>getByteFrequencyData</code> runs an <strong>FFT</strong> inside the analyser. That shows where energy
          sits in frequency — useful to see a click vs a hum. It is <strong>not</strong> a LUFS loudness readout; see
          the loudness box below.
        </GlossaryItem>
      </div>

      <div className="glass-panel mb-6 grid gap-4 rounded-2xl p-4 md:grid-cols-2">
        <div>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-stone-500">
            <Cable className="h-4 w-4" />
            Source path
          </h2>
          <div className="flex flex-wrap gap-2">
            {(['kit', 'tabla'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPath(p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  path === p
                    ? 'bg-sky-600 text-white'
                    : 'bg-stone-200 text-stone-800 dark:bg-zinc-800 dark:text-zinc-200'
                }`}
              >
                {p === 'kit' ? 'Kit (catalog trim)' : 'Tabla (pattern bus)'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-stone-500">Accent</h2>
          <div className="flex flex-wrap gap-2">
            {ACCENT_OPTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAccent(a)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  accent === a ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-800 dark:bg-zinc-800'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {path === 'kit' ? (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-stone-600 dark:text-zinc-300">Kit sound (all options)</h2>
          <div className="flex max-h-48 flex-col flex-wrap gap-1 overflow-auto md:max-h-64">
            {soundOptions.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSound(o.id)}
                className={`w-full min-w-[12rem] rounded-md px-2 py-1 text-left text-sm md:w-56 ${
                  sound === o.id ? 'bg-amber-500/25 ring-1 ring-amber-500' : 'hover:bg-stone-100 dark:hover:bg-zinc-800/80'
                }`}
              >
                {o.name}
                <span className="ml-1 text-xs text-stone-500">trim {soundOutputTrim[o.id]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold">Tabla bol (beat pattern cycle)</h2>
          <div className="flex flex-wrap gap-2">
            {BOL_OPTIONS.map((b) => (
              <button
                key={b.index}
                type="button"
                onClick={() => setBolIndex(b.index)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  bolIndex === b.index
                    ? 'bg-violet-600 text-white'
                    : 'bg-stone-200 text-stone-800 dark:bg-zinc-800'
                }`}
              >
                {b.index} · {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-col gap-3 rounded-xl border border-stone-200/80 bg-stone-50/50 p-3 dark:border-zinc-600/50 dark:bg-zinc-900/30">
        <div className="flex flex-wrap items-center gap-3">
          {isLooping ? (
            <button
              type="button"
              onClick={() => setIsLooping(false)}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow"
            >
              <Pause className="h-4 w-4" />
              Stop pulsing
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsLooping(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow"
            >
              <Play className="h-4 w-4" />
              Start pulsing
            </button>
          )}
          <label className="flex min-w-0 max-w-sm flex-1 items-center gap-2 text-xs text-stone-600 dark:text-zinc-400">
            <span className="shrink-0">Every</span>
            <input
              type="range"
              min={200}
              max={1500}
              step={10}
              value={loopIntervalMs}
              onChange={(e) => setLoopIntervalMs(Number(e.target.value))}
              className="min-w-0 flex-1 accent-emerald-600"
            />
            <span className="w-20 shrink-0 font-mono text-[11px]">
              {loopIntervalMs}ms
              <span className="text-stone-400">· ~{(60000 / loopIntervalMs).toFixed(0)} bpm</span>
            </span>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-stone-200/80 pt-3 dark:border-zinc-600/40">
          <button
            type="button"
            onClick={playSingle}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-900 dark:text-amber-100"
          >
            Single (hold capture)
          </button>
          <button
            type="button"
            onClick={measureLikeCalibrate}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-sm dark:border-zinc-600"
          >
            <Activity className="h-4 w-4" />
            Measure (offline, full buffer)
          </button>
          {oneShot ? (
            <button
              type="button"
              onClick={clearHeld}
              className="text-sm text-amber-600 underline decoration-amber-500/40 underline-offset-2 hover:text-amber-500"
            >
              Clear held
            </button>
          ) : null}
          {lastOfflinePeak != null ? (
            <span className="text-xs text-stone-500">
              Measure: peak {lastOfflinePeak.toFixed(4)} · rms12 {lastRms12?.toFixed(4)}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-stone-500">
          Slower interval = more space between transients, easier to read each hit on the spectrum. Very fast rates may
          overlap long decays.
        </p>
      </div>
      {status ? <p className="mb-2 text-xs text-stone-500">{status}</p> : null}
      <p className="mb-1 text-xs text-stone-400">
        Live |max| (this frame after analyser): {framePeak.toFixed(4)}
      </p>

      <h3 className="mb-2 mt-4 text-xs font-bold uppercase tracking-widest text-amber-600/90 dark:text-amber-400/90">
        Live
      </h3>
      <p className="mb-2 text-xs text-stone-500">Updates every frame. Quiet when no sound is playing.</p>
      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 flex items-center gap-1 text-xs font-medium text-stone-500">
            <Radio className="h-3 w-3" />
            Time domain
          </p>
          <canvas ref={timeCanvasRef} className="h-32 w-full rounded-lg border border-stone-200 dark:border-zinc-700" />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-stone-500">Frequency bins (FFT in Analyser)</p>
          <canvas ref={freqCanvasRef} className="h-32 w-full rounded-lg border border-stone-200 dark:border-zinc-700" />
        </div>
      </div>

      <div
        key={capturePulse}
        className="mb-6 rounded-2xl border-2 border-dashed border-emerald-500/50 bg-emerald-500/[0.06] p-3 transition-shadow dark:border-emerald-400/40"
      >
        <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
          Held (last one-shot)
        </h3>
        <p className="mb-2 text-xs text-stone-600 dark:text-zinc-400">
          {oneShot
            ? `Best frame in ${CAPTURE_WINDOW_MS}ms window → peak ${oneShot.peak.toFixed(4)} · rms12 ~${oneShot.rms12.toFixed(4)} (short buffer) · @ ${new Date(oneShot.atMs).toLocaleTimeString()}`
            : 'Use “Single (hold capture)” to freeze a frame. This row stays until you clear or run Single again.'}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-stone-500">Time (frozen)</p>
            <canvas
              ref={snapTimeCanvasRef}
              className="h-32 w-full rounded-lg border border-emerald-600/30 bg-stone-950/40 dark:border-emerald-500/25"
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-stone-500">Spectrum (frozen)</p>
            <canvas
              ref={snapFreqCanvasRef}
              className="h-32 w-full rounded-lg border border-emerald-600/30 bg-stone-950/40 dark:border-emerald-500/25"
            />
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
          <BookOpen className="h-4 w-4" />
          Loudness: design choices
        </h2>
        <ul className="list-inside list-disc space-y-1.5 text-sm text-stone-600 dark:text-zinc-300">
          <li>
            <strong>Calibration</strong> ({`scripts/calibrate-metronome-levels.ts`}): {LOUDNESS_NOTES.calScript}
          </li>
          <li>
            <strong>LUFS / integrated</strong>: {LOUDNESS_NOTES.lufs}
          </li>
          <li>
            <strong>This page</strong>: {LOUDNESS_NOTES.analyser} Band energy can differ from perceived loudness; do not
            use these bins as EBU-128.
          </li>
        </ul>
      </div>

      <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
        <h2 className="mb-2 text-sm font-bold">Output bus (schematic, static)</h2>
        <pre className="overflow-x-auto rounded-md bg-stone-900 p-3 text-xs text-emerald-200/95">{OUTPUT_BUS_SCHEMATIC}</pre>
      </div>

      {summary && path === 'kit' ? (
        <div className="mb-4 rounded-xl border border-stone-200 p-4 dark:border-zinc-700">
          <h2 className="mb-1 text-sm font-bold">
            {sound} · {soundOptions.find((s) => s.id === sound)?.name}
          </h2>
          <p className="mb-2 text-sm text-stone-600 dark:text-zinc-400">{summary.summary}</p>
          <ol className="list-decimal pl-4 text-sm text-stone-700 dark:text-zinc-200">
            {summary.graph.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </div>
      ) : path === 'tabla' ? (
        <div className="mb-4 rounded-xl border border-stone-200 p-4 text-sm text-stone-600 dark:border-zinc-700 dark:text-zinc-300">
          <h2 className="mb-1 text-sm font-bold">Tabla bol graph (pattern bus)</h2>
          <p>
            Two oscillators: each to its own biquad (f1, f2), then summed in one gain → <code>connectPatternBus</code> →
            same master as kit.
          </p>
          <p className="mt-1 text-xs">
            See <code>playTablaBolAt</code> in <code>patternSynth.ts</code> for per-bol frequencies and envelope.
          </p>
        </div>
      ) : null}
    </div>
  );
}
