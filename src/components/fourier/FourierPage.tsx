import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, FileAudio2, Pause, Play, Sparkles, Waves } from 'lucide-react';
import { realFftMagnitude, stftMagnitudes } from '../../utils/audio/fft';

const FFT_MIN_EXP = 8;
const FFT_MAX_EXP = 14;

function fftSizeFromExp(exp: number): number {
  return 1 << exp;
}

/** Lower end of the “max display Hz” slider; stays below Nyquist. */
function minFrequencySlider(nyq: number): number {
  return Math.max(1, Math.min(2000, Math.floor(nyq * 0.05)));
}

function toDbNorm(m: number, ref: number): number {
  const d = 20 * Math.log10((m + 1e-20) / (ref + 1e-20));
  return d;
}

function drawSpectrum1D(
  ctx: CanvasRenderingContext2D,
  hz: Float32Array,
  mag: Float32Array,
  w: number,
  h: number,
  sampleRate: number,
  maxHz: number,
  rangeDb: number,
) {
  const padL = 48;
  const padR = 10;
  const padT = 8;
  const padB = 24;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const nyq = sampleRate * 0.5;
  const xMax = Math.min(maxHz, nyq);
  let kShow = 0;
  for (let k = 0; k < mag.length; k += 1) {
    if (hz[k]! <= xMax) {
      kShow = k + 1;
    }
  }
  if (kShow < 1) {
    kShow = 1;
  }
  let maxM = 1e-12;
  for (let k = 0; k < kShow; k += 1) {
    const v = mag[k]!;
    if (v > maxM) {
      maxM = v;
    }
  }
  const dTop = 0;
  const dBottom = -rangeDb;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(100,100,100,0.3)';
  for (let g = 0; g <= 4; g += 1) {
    const y = padT + innerH * (g / 4);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(14, 165, 233, 0.9)';
  for (let k = 0; k < kShow; k += 1) {
    const f0 = hz[k]!;
    const f1 = k + 1 < kShow ? hz[k + 1]! : xMax;
    const x0 = padL + (f0 / xMax) * innerW;
    const x1 = padL + (f1 / xMax) * innerW;
    const bw = Math.max(1, x1 - x0);
    const d = toDbNorm(mag[k] ?? 0, maxM);
    const t = (d - dBottom) / (dTop - dBottom + 1e-9);
    const u = Math.max(0, Math.min(1, t));
    const bh = u * innerH;
    const y0 = padT + innerH - bh;
    ctx.fillRect(x0, y0, bw, bh);
  }
  ctx.fillStyle = 'currentColor';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('0', padL, h - 8);
  ctx.fillText(`${Math.round(xMax * 0.25)} Hz`, padL + innerW * 0.25, h - 8);
  ctx.fillText(`${Math.round(xMax * 0.5)} Hz`, padL + innerW * 0.5, h - 8);
  ctx.fillText(`${Math.round(xMax * 0.75)} Hz`, padL + innerW * 0.75, h - 8);
  ctx.fillText(`${Math.round(xMax)} Hz`, padL + innerW, h - 8);
  ctx.textAlign = 'left';
  ctx.fillText(`Magnitude 0 dB = peak, span ${Math.round(rangeDb)} dB`, 6, 14);
}

function drawSpectrogram(
  ctx: CanvasRenderingContext2D,
  mags: Float32Array,
  frameCount: number,
  binCount: number,
  fftSize: number,
  w: number,
  h: number,
  sampleRate: number,
  maxHz: number,
  drDb: number,
) {
  const padL = 40;
  const padB = 22;
  const innerW = w - padL - 8;
  const innerH = h - padB - 6;
  const df = sampleRate / fftSize;
  let kMax = 0;
  for (let k = 0; k < binCount; k += 1) {
    if (k * df <= maxHz) {
      kMax = k + 1;
    }
  }
  kMax = Math.max(1, Math.min(kMax, binCount));
  let gMax = 1e-20;
  for (let t = 0; t < frameCount; t += 1) {
    const o = t * binCount;
    for (let k = 0; k < kMax; k += 1) {
      const v = mags[o + k]!;
      if (v > gMax) {
        gMax = v;
      }
    }
  }
  const dLow = -drDb;
  const dHi = 0;
  const img = ctx.createImageData(innerW, innerH);
  const data = img.data;
  for (let px = 0; px < innerW; px += 1) {
    const t = Math.min(frameCount - 1, Math.floor((px * frameCount) / innerW));
    for (let py = 0; py < innerH; py += 1) {
      const kb = kMax - 1 - Math.floor((py * kMax) / innerH);
      const mag = mags[t * binCount + kb] ?? 0;
      const d = toDbNorm(mag, gMax);
      const u = (d - dLow) / (dHi - dLow + 1e-9);
      const v = Math.max(0, Math.min(1, u));
      const r = 20 + 220 * (1 - v) * 0.3;
      const g = 40 + 180 * v;
      const b = 120 + 120 * (1 - v);
      const o = (py * innerW + px) * 4;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = 255;
    }
  }
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, w, h);
  ctx.putImageData(img, padL, 6);
  ctx.strokeStyle = 'rgba(200,200,200,0.2)';
  ctx.strokeRect(padL, 6, innerW, innerH);
  ctx.fillStyle = 'currentColor';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('time →', padL + innerW * 0.45, h - 6);
  ctx.save();
  ctx.translate(10, 6 + innerH * 0.5);
  ctx.rotate(-Math.PI * 0.5);
  ctx.textAlign = 'center';
  ctx.fillText('freq ↑', 0, 0);
  ctx.restore();
  ctx.textAlign = 'right';
  ctx.fillText('0', padL - 2, 6 + innerH);
  ctx.fillText(`${Math.round(maxHz)} Hz`, padL - 2, 6 + 6);
}

function windowStartSample(fullLen: number, fftSize: number, t01: number): number {
  if (fullLen <= fftSize) {
    return 0;
  }
  const maxS = fullLen - fftSize;
  return Math.max(0, Math.min(maxS, Math.floor(t01 * maxS)));
}

type FourierPageProps = { onBack: () => void };

export function FourierPage({ onBack }: FourierPageProps) {
  const fileId = useId();
  const specRef = useRef<HTMLCanvasElement>(null);
  const stftRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [totalSamples, setTotalSamples] = useState(0);
  const [sampleRate, setSampleRate] = useState(44100);
  const [fftExp, setFftExp] = useState(11);
  const fftSize = useMemo(() => fftSizeFromExp(fftExp), [fftExp]);
  const [hann, setHann] = useState(true);
  /** 0 = start, 1 = end of file (sliding single-frame analysis window) */
  const [windowT, setWindowT] = useState(0.15);
  /** Spectrum y-axis: dB from peak to bottom */
  const [spectrumDb, setSpectrumDb] = useState(72);
  const [maxHz, setMaxHz] = useState(12000);
  /** STFT: hop as 1 - overlap, overlap 0–0.75 → hop = N * (1 - overlap) */
  const [overlap01, setOverlap01] = useState(0.5);
  /** How many seconds at the start of the file the spectrogram uses (caps CPU) */
  const [stftSpanSec, setStftSpanSec] = useState(24);
  const [stftRangeDb, setStftRangeDb] = useState(72);
  const [stftWorking, setStftWorking] = useState(false);
  const bufferRef = useRef<Float32Array | null>(null);
  const [stft, setStft] = useState<ReturnType<typeof stftMagnitudes> | null>(null);
  const [oneFrame, setOneFrame] = useState<{
    hz: Float32Array;
    mag: Float32Array;
    startIndex: number;
  } | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const nyq = sampleRate * 0.5;

  useEffect(() => {
    return () => {
      if (playUrl) {
        URL.revokeObjectURL(playUrl);
      }
    };
  }, [playUrl]);

  useEffect(() => {
    if (maxHz > nyq) {
      setMaxHz(Math.max(1, Math.floor(nyq)));
    }
  }, [maxHz, nyq]);

  const recompute1D = useCallback(
    (sr: number) => {
      const full = bufferRef.current;
      if (!full) {
        setOneFrame(null);
        return;
      }
      const start = windowStartSample(full.length, fftSize, windowT);
      const end = start + Math.min(fftSize, full.length);
      const segment = full.subarray(start, end);
      const { hz, mag } = realFftMagnitude(segment, fftSize, sr, { hann });
      setOneFrame({ hz, mag, startIndex: start });
    },
    [fftSize, hann, windowT],
  );

  useEffect(() => {
    recompute1D(sampleRate);
  }, [recompute1D, sampleRate, totalSamples]);

  useEffect(() => {
    const full = bufferRef.current;
    if (!full) {
      setStft(null);
      setStftWorking(false);
      return;
    }
    setStftWorking(true);
    const n = full.length;
    const spanS = stftSpanSec;
    const maxSamples = Math.min(n, Math.max(1, Math.floor(sampleRate * spanS)));
    const segment = full.subarray(0, maxSamples);
    const hop = Math.max(1, Math.floor(fftSize * (1 - overlap01)));
    const id = window.setTimeout(() => {
      const out = stftMagnitudes(segment, sampleRate, {
        fftSize,
        hann,
        hop,
        maxFrames: 1000,
      });
      setStft(out);
      setStftWorking(false);
    }, 0);
    return () => {
      window.clearTimeout(id);
    };
  }, [fftSize, hann, sampleRate, stftSpanSec, overlap01, totalSamples]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) {
      return;
    }
    setError(null);
    setName(f.name);
    setStft(null);
    setOneFrame(null);
    setPlayUrl(URL.createObjectURL(f));
    f.arrayBuffer()
      .then(async (ab) => {
        const ctx = new AudioContext();
        const buf = await ctx.decodeAudioData(ab.slice(0));
        void ctx.close();
        if (buf.numberOfChannels < 1) {
          setError('No audio channel.');
          setPlayUrl(null);
          return;
        }
        setSampleRate(buf.sampleRate);
        setDurationSec(buf.duration);
        const ch = buf.getChannelData(0);
        const copy = new Float32Array(ch.length);
        copy.set(ch);
        bufferRef.current = copy;
        setTotalSamples(copy.length);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not decode audio');
        setStftWorking(false);
        setPlayUrl(null);
      });
  };

  const maxHzCapped = Math.min(maxHz, Math.floor(nyq));

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el || !playUrl) {
      return;
    }
    if (isPlaying) {
      el.pause();
    } else {
      void el.play().catch(() => {
        // Ignore NotAllowedError (no user gesture) if browser blocks
      });
    }
  }, [isPlaying, playUrl]);

  useLayoutEffect(() => {
    const c = specRef.current;
    if (!c || !oneFrame) {
      return;
    }
    const w = 720;
    const h = 200;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.floor(w * dpr);
    c.height = Math.floor(h * dpr);
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    const x = c.getContext('2d');
    if (!x) {
      return;
    }
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.scale(dpr, dpr);
    drawSpectrum1D(x, oneFrame.hz, oneFrame.mag, w, h, sampleRate, maxHzCapped, spectrumDb);
  }, [oneFrame, sampleRate, maxHzCapped, spectrumDb]);

  useLayoutEffect(() => {
    const c = stftRef.current;
    if (!c || !stft) {
      return;
    }
    const w = 720;
    const h = 220;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.floor(w * dpr);
    c.height = Math.floor(h * dpr);
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    const x = c.getContext('2d');
    if (!x) {
      return;
    }
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.scale(dpr, dpr);
    drawSpectrogram(
      x,
      stft.mags,
      stft.frameCount,
      stft.binCount,
      stft.fftSize,
      w,
      h,
      sampleRate,
      maxHzCapped,
      stftRangeDb,
    );
  }, [stft, sampleRate, maxHzCapped, stftRangeDb]);

  return (
    <div className="music-studio-page w-full max-w-3xl text-left text-stone-800 dark:text-zinc-100">
      <button
        type="button"
        onClick={onBack}
        className="theme-back-link mb-6 transition-colors"
      >
        ← Back to Home
      </button>

      <h1 className="mb-2 text-3xl font-bold tracking-tight">Fourier &amp; short-time analysis</h1>
      <p className="mb-6 text-stone-600 dark:text-zinc-400">
        Load any audio the browser can decode. You get one <strong>FFT window</strong> (spectrum at a
        point in time) and a <strong>rough spectrogram</strong> (STFT) over the start of the file. All
        processing uses the <strong>first channel</strong> only. This is for learning and
        inspection—not broadcast loudness (that is a different model, e.g. LUFS).
      </p>

      <div className="mb-6 rounded-2xl border border-stone-200 bg-stone-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-stone-700 dark:text-zinc-200">
          <BookOpen className="h-4 w-4" />
          How to read the controls
        </h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-stone-600 dark:text-zinc-400">
          <li>
            <strong>FFT size</strong> (power of 2): longer windows → finer <em>frequency</em> resolution
            (bins spaced by <code className="text-xs">sampleRate / N</code> Hz) but <em>worse</em> time
            resolution for the spectrogram, because one frame is longer.
          </li>
          <li>
            <strong>Window time</strong>: where in the file the <em>single</em> spectrum is taken. 0% =
            first sample, 100% = last valid start (so a full N-sample window still fits). Use it to
            “aim” the FFT at a verse, a drum hit, or noise.
          </li>
          <li>
            <strong>Hann window</strong>: tapers the ends of the block so a sine does not get smeared
            across the spectrum (spectral leakage) when the block does not line up on a full period.
          </li>
          <li>
            <strong>Max display frequency</strong>: the plots only show energy up to this Hz; useful to
            zoom the bass and mids. Nyquist is {Math.round(nyq)} Hz at your current file rate.
          </li>
          <li>
            <strong>STFT time span &amp; overlap</strong>: the spectrogram only analyzes the{' '}
            <em>first</em> T seconds to keep the tab responsive. <strong>Overlap</strong> sets hop ≈
            (1&nbsp;−&nbsp;overlap)&nbsp;×&nbsp;N: more overlap = smoother time, more work. The engine
            may increase hop a bit to cap the number of columns.
          </li>
        </ul>
      </div>

      <div className="mb-6">
        <input id={fileId} type="file" accept="audio/*" className="sr-only" onChange={onFile} />
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor={fileId}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-sky-600/50 bg-sky-600/10 px-4 py-3 text-sm font-semibold text-sky-900 dark:text-sky-100"
          >
            <FileAudio2 className="h-4 w-4" />
            Load audio
          </label>
          {playUrl ? (
            <>
              <button
                type="button"
                onClick={togglePlay}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/50 bg-emerald-600/10 px-4 py-3 text-sm font-semibold text-emerald-900 dark:text-emerald-100"
                aria-pressed={isPlaying}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <audio
                ref={audioRef}
                src={playUrl}
                className="sr-only"
                preload="auto"
                onPlay={() => {
                  setIsPlaying(true);
                }}
                onPause={() => {
                  setIsPlaying(false);
                }}
                onEnded={() => {
                  setIsPlaying(false);
                }}
              />
            </>
          ) : null}
        </div>
        {name ? (
          <p className="mt-2 text-sm text-stone-500">
            {name} · {durationSec.toFixed(2)}s · {totalSamples} samples · {Math.round(sampleRate)} Hz
          </p>
        ) : (
          <p className="mt-2 text-sm text-stone-500">No file yet.</p>
        )}
        {playUrl && name ? (
          <p className="mt-1 text-xs text-stone-500 dark:text-zinc-500">Use Play to listen while you move the window time and spectrum sliders.</p>
        ) : null}
        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      </div>

      <div className="mb-4 space-y-4 rounded-2xl border border-sky-500/30 bg-sky-500/[0.06] p-4 dark:border-sky-400/25">
        <h2 className="flex items-center gap-2 text-sm font-bold text-sky-900 dark:text-sky-200">
          <Sparkles className="h-4 w-4" />
          Tuning
        </h2>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-stone-500">
            <span>FFT size (N)</span>
            <span className="font-mono">
              {fftSize} · Δf ≈ {(sampleRate / fftSize).toFixed(2)} Hz/bin
            </span>
          </div>
          <input
            type="range"
            min={FFT_MIN_EXP}
            max={FFT_MAX_EXP}
            step={1}
            value={fftExp}
            onChange={(e) => {
              setFftExp(Number(e.target.value));
            }}
            className="w-full accent-sky-600"
            aria-label="FFT size exponent"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-stone-500">
            <span>Window time (for spectrum only)</span>
            <span className="font-mono">
              {Math.floor(windowT * 100)}% along file · oneFrame @ sample{' '}
              {oneFrame?.startIndex ?? 0}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={windowT}
            onChange={(e) => {
              setWindowT(Number(e.target.value));
            }}
            className="w-full accent-sky-600"
            disabled={totalSamples < 1}
            aria-label="Window position in file"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-stone-500">
            <span>Spectrum dynamic range (dB)</span>
            <span className="font-mono">top = peak, bottom = peak − {spectrumDb} dB</span>
          </div>
          <input
            type="range"
            min={20}
            max={100}
            step={1}
            value={spectrumDb}
            onChange={(e) => {
              setSpectrumDb(Number(e.target.value));
            }}
            className="w-full accent-sky-600"
            aria-label="Spectrum decibel range"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-stone-500">
            <span>Max display frequency (Hz)</span>
            <span className="font-mono">≤ {maxHzCapped} Hz</span>
          </div>
          <input
            type="range"
            min={minFrequencySlider(nyq)}
            max={Math.max(minFrequencySlider(nyq), Math.floor(nyq))}
            step={100}
            value={Math.min(maxHz, Math.floor(nyq))}
            onChange={(e) => {
              setMaxHz(Number(e.target.value));
            }}
            className="w-full accent-sky-600"
            aria-label="Max frequency to display"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-zinc-300">
          <input
            type="checkbox"
            className="accent-sky-600"
            checked={hann}
            onChange={(e) => {
              setHann(e.target.checked);
            }}
          />
          Hann window
        </label>
      </div>

      <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-500">
        One frame · magnitude spectrum
      </h3>
      <p className="mb-2 text-xs text-stone-500">
        A single DFT/FFT of N samples. Bright = stronger at that bin (dB down from the peak in the
        visible band, not an absolute SPL).
      </p>
      <canvas
        ref={specRef}
        className="mb-8 w-full max-w-3xl rounded-lg border border-stone-200 bg-stone-950/30 dark:border-zinc-700"
        aria-label="Single window magnitude spectrum"
      />

      <div className="mb-4 space-y-4 rounded-2xl border border-violet-500/30 bg-violet-500/[0.06] p-4 dark:border-violet-400/20">
        <h2 className="flex items-center gap-2 text-sm font-bold text-violet-900 dark:text-violet-200">
          <Waves className="h-4 w-4" />
          Spectrogram (STFT) controls
        </h2>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-stone-500">
            <span>Time span from start of file (s)</span>
            <span className="font-mono">
              {stftSpanSec}s
              {stft ? ` · ${stft.frameCount} columns · hop ${stft.hopSamples} samples` : null}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={90}
            step={1}
            value={stftSpanSec}
            onChange={(e) => {
              setStftSpanSec(Number(e.target.value));
            }}
            className="w-full accent-violet-600"
            aria-label="STFT time span in seconds"
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-stone-500">
            <span>Frame overlap</span>
            <span className="font-mono">{(overlap01 * 100).toFixed(0)}% → hop ≈ {Math.max(1, Math.floor(fftSize * (1 - overlap01)))} samples</span>
          </div>
          <input
            type="range"
            min={0}
            max={0.75}
            step={0.01}
            value={overlap01}
            onChange={(e) => {
              setOverlap01(Number(e.target.value));
            }}
            className="w-full accent-violet-600"
            aria-label="STFT frame overlap"
          />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-stone-500">
            <span>Spectrogram dynamic range (dB ref frame peak)</span>
            <span className="font-mono">0 dB = brightest cell (global max in plot)</span>
          </div>
          <input
            type="range"
            min={30}
            max={100}
            step={1}
            value={stftRangeDb}
            onChange={(e) => {
              setStftRangeDb(Number(e.target.value));
            }}
            className="w-full accent-violet-600"
            aria-label="Spectrogram dB range"
          />
        </div>
        {stftWorking ? <p className="text-xs text-stone-500">Computing…</p> : null}
      </div>

      <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-500">
        Spectrogram
      </h3>
      <p className="mb-2 text-xs text-stone-500">
        Many FFTs in a row (short-time transform). Time runs left to right, frequency bottom to
        top; color is 20·log10(magnitude) relative to the strongest cell in the image.
        {stft && stft.frameCount >= 1000 ? ' Column count is capped; hop may be larger than the pure overlap formula.' : null}
      </p>
      <canvas
        ref={stftRef}
        className="mb-4 w-full max-w-3xl rounded-lg border border-stone-200 bg-stone-950/30 dark:border-zinc-700"
        aria-label="STFT spectrogram"
      />
    </div>
  );
}
