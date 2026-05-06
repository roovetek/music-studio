/**
 * Sonic Fingerprint Lab — main page component.
 *
 * Layout:
 *   Hero drop-zone + URL input
 *   ├── Sidebar: mode selector, style toggle, Lo-Fi slider, FastAPI status
 *   ├── Gallery: 3 reference tones (Sine 440, C-Major, Tabla Dha)
 *   └── Central canvas (or FastAPI base64 <img> for spectrogram)
 *
 * Rendering split:
 *   BROWSER PATH  → waveform, density, solid, phase, mandala
 *   FASTAPI PATH  → spectrogram (with browser STFT fallback)
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  Upload,
  Link,
  ChevronDown,
  Waves,
  Fingerprint,
  Music,
  AlertCircle,
  X,
  Loader2,
  Circle,
} from 'lucide-react';
import { decodeFile, decodeUrl, applyLoFi, type AudioData } from '../../utils/sonicLab/loadAudio';
import { autoStereo } from '../../utils/sonicLab/autoStereo';
import { makeSine440, makeCMajor, makeTablaDha } from '../../utils/sonicLab/samples';
import { renderWaveform } from './renderers/waveform';
import { renderDensity } from './renderers/density';
import { renderSolid } from './renderers/solid';
import { renderPhase } from './renderers/phase';
import { renderMandala } from './renderers/mandala';
import { renderSpectrogram, type SpectrogramResult } from './renderers/spectrogram';
import { drawPlaceholder } from './renderers/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

type VizMode = 'waveform' | 'density' | 'solid' | 'phase' | 'mandala' | 'spectrogram';
type PlotStyle = 'dots' | 'lines';

const MODE_LABELS: Record<VizMode, string> = {
  waveform: 'Visual Art (Waveform)',
  density: 'Density Cloud',
  solid: 'Solid Look (Filled)',
  phase: 'Phase Look (Lissajous)',
  mandala: 'Mandala Art (Polar)',
  spectrogram: 'Visual Challenge (Spectrogram)',
};

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastState = {
  message: string;
  action?: { label: string; onClick: () => void };
} | null;

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-950/90 px-5 py-3 text-amber-100 shadow-xl">
      <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
      <span className="text-sm">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => { toast.action!.onClick(); onClose(); }}
          className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/30"
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" onClick={onClose} className="ml-1 text-amber-400 hover:text-amber-200">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── FastAPI status badge ─────────────────────────────────────────────────────

function ApiStatusBadge({ status }: { status: 'unknown' | 'online' | 'offline' }) {
  const colour =
    status === 'online'
      ? 'text-emerald-400'
      : status === 'offline'
        ? 'text-stone-500'
        : 'text-amber-400';
  const label =
    status === 'online' ? 'FastAPI online' : status === 'offline' ? 'FastAPI offline (browser fallback)' : 'FastAPI …';
  return (
    <div className={`flex items-center gap-1.5 text-xs ${colour}`}>
      <Circle className="h-2 w-2 fill-current" />
      {label}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Props = { onBack: () => void };

export function SonicLabPage({ onBack }: Props) {
  // Audio state
  const [audio, setAudio] = useState<AudioData | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Viz controls
  const [mode, setMode] = useState<VizMode>('waveform');
  const [style, setStyle] = useState<PlotStyle>('lines');
  const [lofiSkip, setLofiSkip] = useState(1);

  // Phase / auto-stereo
  const [isFakedStereo, setIsFakedStereo] = useState(false);
  const [activeChannels, setActiveChannels] = useState<Float32Array[]>([]);

  // Spectrogram state
  const [spectrogramSrc, setSpectrogramSrc] = useState<string | null>(null);
  const [spectrogramResult, setSpectrogramResult] = useState<SpectrogramResult | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  // FastAPI health
  const [apiStatus, setApiStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');

  // Toast
  const [toast, setToast] = useState<ToastState>(null);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ─── FastAPI health probe ───────────────────────────────────────────
  useEffect(() => {
    const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
    const endpoint = apiBase ? `${apiBase}/api/health` : '/api/health';
    fetch(endpoint, { signal: AbortSignal.timeout(3000) })
      .then((r) => setApiStatus(r.ok ? 'online' : 'offline'))
      .catch(() => setApiStatus('offline'));
  }, []);

  // ─── Accent colour from CSS variable ───────────────────────────────
  const accentColor = (() => {
    if (typeof window === 'undefined') return '#0ea5e9';
    const v = getComputedStyle(document.documentElement).getPropertyValue('--app-accent').trim();
    return v || '#0ea5e9';
  })();
  const fillColor = accentColor.startsWith('#')
    ? accentColor + '33'
    : accentColor.replace('rgb(', 'rgba(').replace(')', ', 0.2)');

  // ─── Load helpers ───────────────────────────────────────────────────
  const loadAudio = useCallback((data: AudioData, file: File | null) => {
    setAudio(data);
    setSourceFile(file);
    setLoadError(null);
    setIsFakedStereo(false);
    setSpectrogramSrc(null);
    setSpectrogramResult(null);
    setActiveChannels(data.channels);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      try {
        const data = await decodeFile(file);
        loadAudio(data, file);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Could not decode file');
      } finally {
        setIsLoading(false);
      }
    },
    [loadAudio],
  );

  const handleUrl = useCallback(async () => {
    if (!urlInput.trim()) return;
    setIsLoading(true);
    try {
      const data = await decodeUrl(urlInput.trim());
      loadAudio(data, null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load URL');
    } finally {
      setIsLoading(false);
    }
  }, [urlInput, loadAudio]);

  const handleGallery = useCallback(
    (generator: () => AudioData) => {
      const data = generator();
      loadAudio(data, null);
    },
    [loadAudio],
  );

  // ─── Drag-and-drop ─────────────────────────────────────────────────
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  // ─── Auto-stereo action ─────────────────────────────────────────────
  const applyAutoStereo = useCallback(() => {
    if (!audio) return;
    const mono = audio.channels[0]!;
    const [L, R] = autoStereo(mono, 12);
    setActiveChannels([L, R]);
    setIsFakedStereo(true);
  }, [audio]);

  // ─── Compute working channels (with Lo-Fi) ──────────────────────────
  const workingChannels = (() => {
    if (lofiSkip <= 1) return activeChannels;
    return applyLoFi(activeChannels, lofiSkip);
  })();
  const workingSamples = workingChannels[0] ?? new Float32Array(0);
  const sampleRate = lofiSkip > 1 && audio ? audio.sampleRate / lofiSkip : (audio?.sampleRate ?? 44100);

  // ─── Render canvas (non-spectrogram modes) ───────────────────────────
  useLayoutEffect(() => {
    if (mode === 'spectrogram') return;
    const c = canvasRef.current;
    if (!c) return;

    const W = 720;
    const H = 320;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.floor(W * dpr);
    c.height = Math.floor(H * dpr);
    c.style.width = `${W}px`;
    c.style.height = `${H}px`;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const opts = { style, accentColor, fillColor };

    if (!audio || workingSamples.length === 0) {
      drawPlaceholder(ctx, W, H);
      return;
    }

    switch (mode) {
      case 'waveform':
        renderWaveform(ctx, W, H, workingSamples, opts);
        break;
      case 'density':
        renderDensity(ctx, W, H, workingSamples, opts);
        break;
      case 'solid':
        renderSolid(ctx, W, H, workingSamples, opts);
        break;
      case 'phase': {
        const result = renderPhase(ctx, W, H, workingChannels, opts, isFakedStereo);
        if (result.needsStereo && !isFakedStereo) {
          setToast({
            message: 'Phase Look needs a stereo file to compare L and R channels.',
            action: { label: 'Try Auto-Stereo', onClick: applyAutoStereo },
          });
        }
        break;
      }
      case 'mandala':
        renderMandala(ctx, W, H, workingSamples, opts);
        break;
    }
  }, [mode, style, audio, workingSamples, workingChannels, isFakedStereo, accentColor, fillColor, applyAutoStereo]);

  // ─── Render spectrogram (async) ──────────────────────────────────────
  useEffect(() => {
    if (mode !== 'spectrogram' || !audio) {
      setSpectrogramSrc(null);
      return;
    }

    let cancelled = false;
    setIsRendering(true);

    const c = canvasRef.current;
    if (!c) { setIsRendering(false); return; }

    const W = 720;
    const H = 320;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.floor(W * dpr);
    c.height = Math.floor(H * dpr);
    c.style.width = `${W}px`;
    c.style.height = `${H}px`;
    const ctx = c.getContext('2d');
    if (!ctx) { setIsRendering(false); return; }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    void renderSpectrogram(ctx, W, H, workingSamples, sampleRate, sourceFile, style, lofiSkip).then(
      (result) => {
        if (cancelled) return;
        setSpectrogramResult(result);
        if (result.source === 'fastapi') {
          setSpectrogramSrc(`data:image/png;base64,${result.imageB64}`);
          setApiStatus('online');
        } else {
          setSpectrogramSrc(null);
          if (result.source === 'browser') setApiStatus('offline');
        }
        setIsRendering(false);
      },
    );

    return () => { cancelled = true; };
  }, [mode, audio, workingSamples, sampleRate, sourceFile, style, lofiSkip]);

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="music-studio-page w-full max-w-5xl text-left text-stone-800 dark:text-zinc-100">
      <button
        type="button"
        onClick={onBack}
        className="theme-back-link mb-6 transition-colors"
      >
        ← Back to Home
      </button>

      <h1 className="mb-1 text-3xl font-bold tracking-tight flex items-center gap-3">
        <Fingerprint className="h-8 w-8 text-sky-500" />
        Sonic Fingerprint Lab
      </h1>
      <p className="mb-6 text-stone-600 dark:text-zinc-400 text-sm">
        Upload any audio, pick a visualization mode, and explore the shape of sound.
        Six modes — five run in your browser, spectrogram uses FastAPI when available.
      </p>

      {/* ── Main grid ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">

        {/* ── Left: drop zone + canvas ── */}
        <div className="flex flex-col gap-4">

          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="rounded-2xl border-2 border-dashed border-sky-500/40 bg-sky-500/[0.04] p-6 text-center transition-colors hover:border-sky-500/60"
          >
            <Upload className="mx-auto mb-2 h-8 w-8 text-sky-400/70" />
            <p className="mb-3 text-sm text-stone-600 dark:text-zinc-400">
              Drop an <strong>.mp3</strong> or <strong>.wav</strong> here, or
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-sky-600/50 bg-sky-600/10 px-4 py-2 text-sm font-semibold text-sky-900 dark:text-sky-100 hover:bg-sky-600/20">
              <Upload className="h-4 w-4" />
              Browse file
              <input
                type="file"
                accept="audio/*"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }}
              />
            </label>

            {/* URL input */}
            <div className="mt-4 flex gap-2">
              <input
                type="url"
                placeholder="Or paste a URL to audio…"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleUrl(); }}
                className="min-w-0 flex-1 rounded-xl border border-stone-300/50 bg-white/60 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:border-zinc-600/50 dark:bg-zinc-800/60 dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={handleUrl}
                disabled={!urlInput.trim() || isLoading}
                className="flex items-center gap-1.5 rounded-xl border border-sky-600/50 bg-sky-600/10 px-3 py-2 text-sm font-semibold text-sky-900 disabled:opacity-40 dark:text-sky-100"
              >
                <Link className="h-4 w-4" />
                Load
              </button>
            </div>
          </div>

          {/* File info */}
          {audio && (
            <p className="text-xs text-stone-500 dark:text-zinc-500">
              <strong>{audio.name}</strong> · {audio.durationSec.toFixed(2)}s ·{' '}
              {Math.round(audio.sampleRate)} Hz · {audio.channels.length === 1 ? 'Mono' : 'Stereo'}
              {isFakedStereo && (
                <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-700 dark:text-amber-300">
                  Auto-Stereo (faked)
                </span>
              )}
            </p>
          )}
          {loadError && <p className="text-sm text-rose-500">{loadError}</p>}
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading audio…
            </p>
          )}

          {/* Canvas / FastAPI image */}
          <div className="relative">
            {isRendering && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/40">
                <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
                <span className="ml-2 text-sm text-sky-300">
                  {apiStatus === 'online' ? 'FastAPI rendering…' : 'Computing STFT…'}
                </span>
              </div>
            )}

            {spectrogramSrc ? (
              <img
                src={spectrogramSrc}
                alt="FastAPI spectrogram"
                className="w-full rounded-xl border border-stone-200 bg-stone-950/30 dark:border-zinc-700"
              />
            ) : (
              <canvas
                ref={canvasRef}
                className="w-full rounded-xl border border-stone-200 bg-stone-950/30 dark:border-zinc-700"
                aria-label="Audio visualization"
              />
            )}

            {/* Source badge overlay */}
            {spectrogramResult && (
              <div className="absolute bottom-2 right-2">
                {spectrogramResult.source === 'fastapi' ? (
                  <span className="rounded bg-emerald-800/70 px-2 py-0.5 text-xs text-emerald-300">
                    FastAPI · librosa
                  </span>
                ) : spectrogramResult.source === 'browser' ? (
                  <span className="rounded bg-amber-800/70 px-2 py-0.5 text-xs text-amber-300">
                    Browser STFT
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* Gallery */}
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.05] p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-violet-900 dark:text-violet-200">
              <Music className="h-4 w-4" />
              Reference Library
            </h3>
            <p className="mb-3 text-xs text-stone-500 dark:text-zinc-400">
              Load a synthetic reference to compare against your upload.
              <strong> Sine 440</strong> → perfect circle in Phase Look ·
              <strong> C-Major</strong> → 3 lines in Spectrogram ·
              <strong> Tabla Dha</strong> → sharp percussive spike in Waveform
            </p>
            <div className="flex flex-wrap gap-2">
              {([
                { label: 'Sine 440 Hz', gen: makeSine440, icon: '∿' },
                { label: 'C-Major Chord', gen: makeCMajor, icon: '♩♩♩' },
                { label: 'Tabla Dha (synth)', gen: makeTablaDha, icon: '●' },
              ]).map(({ label, gen, icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleGallery(gen)}
                  className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-900 hover:bg-violet-500/20 dark:text-violet-200"
                >
                  <span className="font-mono text-base">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: sidebar controls ── */}
        <div className="flex flex-col gap-4">

          {/* Mode selector */}
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/[0.06] p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-sky-900 dark:text-sky-200">
              <Waves className="h-4 w-4" />
              Visualization Mode
            </h3>
            <div className="relative">
              <select
                value={mode}
                onChange={(e) => { setMode(e.target.value as VizMode); setSpectrogramSrc(null); }}
                className="w-full appearance-none rounded-xl border border-sky-500/30 bg-white/70 px-3 py-2.5 pr-8 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:bg-zinc-800/80 dark:text-zinc-100"
              >
                {(Object.keys(MODE_LABELS) as VizMode[]).map((m) => (
                  <option key={m} value={m}>{MODE_LABELS[m]}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            </div>
            <p className="mt-2 text-xs text-stone-500 dark:text-zinc-400">
              {mode === 'spectrogram'
                ? 'Frequency × Time. FastAPI (librosa) when available; browser STFT fallback.'
                : mode === 'phase'
                  ? 'L vs R channel Lissajous. Needs stereo — or use Auto-Stereo for mono.'
                  : mode === 'mandala'
                    ? 'Polar: time → angle, amplitude → radius.'
                    : mode === 'density'
                      ? 'Scatter where amplitude hangs out most (low alpha = density).'
                      : mode === 'solid'
                        ? 'Filled silhouette — envelope min/max per pixel column.'
                        : 'Standard amplitude vs. time.'}
            </p>
          </div>

          {/* Plot Style toggle */}
          <div className="rounded-2xl border border-stone-200/60 bg-stone-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
            <h3 className="mb-3 text-sm font-bold text-stone-700 dark:text-zinc-200">Plot Style</h3>
            <div className="flex rounded-xl border border-stone-300/50 dark:border-zinc-600/50 overflow-hidden">
              {(['lines', 'dots'] as PlotStyle[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                    style === s
                      ? 'bg-sky-600 text-white'
                      : 'bg-transparent text-stone-600 hover:bg-stone-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {mode === 'spectrogram' && (
              <p className="mt-1.5 text-xs text-stone-400">Style is passed to FastAPI; ignored in browser fallback.</p>
            )}
          </div>

          {/* Lo-Fi slider */}
          <div className="rounded-2xl border border-stone-200/60 bg-stone-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
            <div className="mb-2 flex justify-between text-xs text-stone-500 dark:text-zinc-400">
              <span>Digital Lo-Fi</span>
              <span className="font-mono">
                {lofiSkip === 1 ? 'Full quality' : `÷${lofiSkip} (effective ${audio ? Math.round(audio.sampleRate / lofiSkip) : '—'} Hz)`}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={32}
              step={1}
              value={lofiSkip}
              onChange={(e) => setLofiSkip(Number(e.target.value))}
              className="w-full accent-sky-600"
            />
            <p className="mt-1.5 text-xs text-stone-400 dark:text-zinc-500">
              Skip every Nth sample. Move right to hear aliasing — Waveform and Density go "jagged."
            </p>
          </div>

          {/* FastAPI status */}
          <div className="rounded-2xl border border-stone-200/60 bg-stone-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
            <h3 className="mb-2 text-sm font-bold text-stone-700 dark:text-zinc-200">Backend</h3>
            <ApiStatusBadge status={apiStatus} />
            <p className="mt-1.5 text-xs text-stone-400 dark:text-zinc-500">
              {apiStatus === 'online'
                ? 'FastAPI is running. Spectrogram uses librosa + matplotlib.'
                : 'No FastAPI server detected. Spectrogram uses the browser STFT fallback.'}
            </p>
          </div>

          {/* Reference guide */}
          <div className="rounded-2xl border border-stone-200/60 bg-stone-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
            <h3 className="mb-2 text-sm font-bold text-stone-700 dark:text-zinc-200">What shapes mean</h3>
            <ul className="space-y-2 text-xs text-stone-500 dark:text-zinc-400">
              <li><strong className="text-stone-700 dark:text-zinc-200">Pure note</strong> — perfect circle in Phase Look; single line in Spectrogram.</li>
              <li><strong className="text-stone-700 dark:text-zinc-200">Chord</strong> — 3+ horizontal lines in Spectrogram; complex beating in Waveform.</li>
              <li><strong className="text-stone-700 dark:text-zinc-200">Piano</strong> — sharp spike at start (attack), long tail (decay) in Waveform.</li>
              <li><strong className="text-stone-700 dark:text-zinc-200">Tabla</strong> — sudden explosion that vanishes almost instantly.</li>
              <li><strong className="text-stone-700 dark:text-zinc-200">Lo-Fi slider</strong> — watch Density go jagged as sample rate drops.</li>
            </ul>
          </div>
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
