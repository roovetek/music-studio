import { useState, useRef, useEffect } from 'react';
import { Upload, Music, ArrowLeft, Loader2, Play, Pause } from 'lucide-react';
import {
  analyzePair,
  findFirstChorusStart,
  FusionApiError,
  getMaxUploadBytes,
  type AudioSegment,
} from '../../utils/musicFusion/audioAnalyzer';

interface MusicFusionLabProps {
  onBack: () => void;
}

interface TrackState {
  file: File | null;
  name: string;
  objectUrl: string | null;
  bpm: number | null;
  duration: number | null;
  segments: AudioSegment[];
  firstChorusStart: number | null;
}

const ALLOWED_EXT = new Set(['.mp3', '.wav']);

function fileExtensionLower(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function isAllowedAudioFile(file: File): boolean {
  return ALLOWED_EXT.has(fileExtensionLower(file.name));
}

function readAudioDurationFromUrl(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      resolve(Number.isFinite(audio.duration) ? audio.duration : null);
    };
    audio.onerror = () => resolve(null);
    audio.src = url;
  });
}

function emptyTrack(): TrackState {
  return {
    file: null,
    name: '',
    objectUrl: null,
    bpm: null,
    duration: null,
    segments: [],
    firstChorusStart: null,
  };
}

export const MusicFusionLab = ({ onBack }: MusicFusionLabProps) => {
  const maxBytes = getMaxUploadBytes();
  const maxMb = Math.round(maxBytes / (1024 * 1024));

  const [audioFiles, setAudioFiles] = useState<[TrackState, TrackState]>([emptyTrack(), emptyTrack()]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([null, null]);
  const tracksSnapshotRef = useRef(audioFiles);

  tracksSnapshotRef.current = audioFiles;

  useEffect(() => {
    return () => {
      tracksSnapshotRef.current.forEach((t) => {
        if (t.objectUrl) URL.revokeObjectURL(t.objectUrl);
      });
    };
  }, []);

  const handleFileSelect = async (index: 0 | 1, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!isAllowedAudioFile(file)) {
      setAnalysisError(`Use .mp3 or .wav only (got ${fileExtensionLower(file.name) || 'unknown'})`);
      return;
    }
    if (file.size > maxBytes) {
      setAnalysisError(`File too large (max ${maxMb} MB per file)`);
      return;
    }

    setAnalysisError(null);

    const objectUrl = URL.createObjectURL(file);
    const duration = await readAudioDurationFromUrl(objectUrl);

    setAudioFiles((prev) => {
      const next = [...prev] as [TrackState, TrackState];
      if (next[index].objectUrl) {
        URL.revokeObjectURL(next[index].objectUrl!);
      }
      next[index] = {
        file,
        name: file.name,
        objectUrl,
        bpm: null,
        duration,
        segments: [],
        firstChorusStart: null,
      };
      return next;
    });
  };

  const handleUploadClick = (index: 0 | 1) => {
    if (index === 0) {
      fileInput1Ref.current?.click();
    } else {
      fileInput2Ref.current?.click();
    }
  };

  const togglePlayback = (index: 0 | 1) => {
    const el = audioRefs.current[index];
    if (!el) return;
    const other = audioRefs.current[1 - index];
    if (el.paused) {
      if (other && !other.paused) other.pause();
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const formatMmSs = (seconds: number | null) => {
    if (seconds === null) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSeconds = (seconds: number | null) => {
    if (seconds === null) return '--';
    return `${seconds.toFixed(2)}s`;
  };

  const handleAnalyzeFiles = async () => {
    const f0 = audioFiles[0].file;
    const f1 = audioFiles[1].file;
    if (!f0 || !f1) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const { tracks } = await analyzePair(f0, f1);
      setAudioFiles((prev) => [
        {
          ...prev[0],
          bpm: tracks[0].bpm,
          segments: tracks[0].segments,
          firstChorusStart: findFirstChorusStart(tracks[0].segments),
        },
        {
          ...prev[1],
          bpm: tracks[1].bpm,
          segments: tracks[1].segments,
          firstChorusStart: findFirstChorusStart(tracks[1].segments),
        },
      ]);
    } catch (err) {
      const message =
        err instanceof FusionApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Analysis failed';
      setAnalysisError(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const bothReady = Boolean(audioFiles[0].file && audioFiles[1].file);

  return (
    <div className="w-full max-w-6xl mx-auto px-6 relative">
      {isAnalyzing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md px-6"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="text-center max-w-lg">
            <Loader2 className="w-20 h-20 text-emerald-400 animate-spin mx-auto mb-8" />
            <p className="text-2xl font-semibold text-white mb-3">Analyzing your tracks</p>
            <p className="text-slate-300 text-lg leading-relaxed mb-2">
              Running allin1 structure analysis. This often takes <strong className="text-white">10–30 seconds</strong>{' '}
              on CPU and is faster on GPU.
            </p>
            <p className="text-slate-500 text-sm">Please keep this page open.</p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        disabled={isAnalyzing}
        className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors disabled:opacity-40"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Home
      </button>

      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
          Music Fusion Lab
        </h1>
        <p className="text-lg text-slate-400">
          Upload two audio files; we detect structure and the first chorus/hook for alignment
        </p>
        <p className="text-sm text-slate-500 mt-2">
          .mp3 or .wav, up to {maxMb} MB each
        </p>
      </div>

      {analysisError && (
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {analysisError}
        </div>
      )}

      {[0, 1].map((index) =>
        audioFiles[index].objectUrl ? (
          <audio
            key={`audio-${index}-${audioFiles[index].objectUrl}`}
            ref={(el) => {
              audioRefs.current[index] = el;
            }}
            src={audioFiles[index].objectUrl!}
            preload="metadata"
            onPlay={() => setPlayingIndex(index)}
            onPause={() => setPlayingIndex((p) => (p === index ? null : p))}
            onEnded={() => setPlayingIndex((p) => (p === index ? null : p))}
          />
        ) : null,
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {[0, 1].map((index) => (
          <div key={index}>
            <input
              ref={index === 0 ? fileInput1Ref : fileInput2Ref}
              type="file"
              accept=".mp3,.wav"
              onChange={(e) => void handleFileSelect(index as 0 | 1, e)}
              className="hidden"
            />

            <div
              role="button"
              tabIndex={isAnalyzing ? -1 : 0}
              onClick={() => {
                if (!isAnalyzing) handleUploadClick(index as 0 | 1);
              }}
              onKeyDown={(e) => {
                if (isAnalyzing) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleUploadClick(index as 0 | 1);
                }
              }}
              className={`w-full group relative overflow-hidden rounded-2xl bg-slate-800/30 border-2 border-dashed border-slate-600 hover:border-slate-500 p-12 transition-all duration-300 hover:bg-slate-800/50 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${isAnalyzing ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                  {audioFiles[index].file ? (
                    <Music className="w-10 h-10 text-emerald-400" />
                  ) : (
                    <Upload className="w-10 h-10 text-slate-400 group-hover:text-slate-300" />
                  )}
                </div>

                <div className="text-center">
                  <p className="text-xl font-semibold text-white mb-2">
                    {audioFiles[index].file ? 'File Selected' : `Upload Track ${index + 1}`}
                  </p>
                  {audioFiles[index].file ? (
                    <p className="text-sm text-emerald-400 font-medium break-all">
                      {audioFiles[index].name}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">
                      .mp3 or .wav, max {maxMb} MB
                    </p>
                  )}
                </div>

                {audioFiles[index].file && audioFiles[index].objectUrl && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlayback(index as 0 | 1);
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600/80 hover:bg-emerald-500/90 text-white px-5 py-2.5 text-sm font-medium transition-colors"
                    >
                      {playingIndex === index ? (
                        <>
                          <Pause className="w-4 h-4" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" /> Preview
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {[0, 1].map((index) => (
          <div
            key={`analysis-${index}`}
            className="rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/50 p-8"
          >
            <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <h3 className="text-xl font-bold text-white">
                  Track {index + 1} Analysis
                </h3>
              </div>
              {audioFiles[index].objectUrl && (
                <button
                  type="button"
                  onClick={() => togglePlayback(index as 0 | 1)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-sm"
                >
                  {playingIndex === index ? (
                    <>
                      <Pause className="w-4 h-4" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" /> Play
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                <span className="text-sm text-slate-400 uppercase tracking-wider">
                  BPM
                </span>
                <span className="text-3xl font-bold text-white">
                  {audioFiles[index].bpm != null ? Math.round(audioFiles[index].bpm) : '--'}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                <span className="text-sm text-slate-400 uppercase tracking-wider">
                  Duration
                </span>
                <span className="text-3xl font-bold text-white">
                  {formatMmSs(audioFiles[index].duration)}
                </span>
              </div>

              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-4">
                <p className="text-xs text-emerald-400/90 uppercase tracking-wider mb-2">
                  Alignment: first chorus / hook
                </p>
                {!audioFiles[index].file ? (
                  <p className="text-slate-500 text-sm">—</p>
                ) : isAnalyzing ? (
                  <p className="text-slate-400 text-sm">Analyzing…</p>
                ) : audioFiles[index].segments.length === 0 ? (
                  <p className="text-slate-500 text-sm">Run analysis to detect chorus</p>
                ) : audioFiles[index].firstChorusStart != null ? (
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-3xl font-bold text-white tabular-nums">
                      {formatMmSs(audioFiles[index].firstChorusStart)}
                    </span>
                    <span className="text-slate-400 text-sm tabular-nums">
                      {formatSeconds(audioFiles[index].firstChorusStart)}
                    </span>
                  </div>
                ) : audioFiles[index].segments.length > 0 ? (
                  <p className="text-amber-200/90 text-sm">
                    No chorus/hook segment detected in this track
                  </p>
                ) : null}
              </div>
            </div>

            {audioFiles[index].segments.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                  Segments (allin1)
                </p>
                <ul className="max-h-40 overflow-y-auto space-y-1.5 text-sm text-slate-300">
                  {audioFiles[index].segments.map((seg, i) => (
                    <li
                      key={`${seg.label}-${seg.start}-${i}`}
                      className="flex justify-between gap-2 border-b border-slate-700/30 pb-1.5 last:border-0"
                    >
                      <span className="capitalize text-white">{seg.label}</span>
                      <span className="text-slate-400 tabular-nums shrink-0">
                        {formatMmSs(seg.start)} – {formatMmSs(seg.end)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!audioFiles[index].file && (
              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500 italic">
                  Upload a file to see analysis
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8">
        <button
          type="button"
          disabled={!bothReady || isAnalyzing}
          onClick={() => void handleAnalyzeFiles()}
          className="w-full group relative overflow-hidden rounded-2xl bg-slate-800/30 border-2 border-dashed border-slate-600 hover:border-slate-500 p-12 transition-all duration-300 hover:bg-slate-800/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-600"
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
              {isAnalyzing ? (
                <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
              ) : (
                <Music className="w-10 h-10 text-emerald-400" />
              )}
            </div>

            <div className="text-center">
              <p className="text-xl font-semibold text-white mb-2">
                {isAnalyzing ? 'Analyzing…' : 'Analyze files'}
              </p>
              <p className="text-sm text-emerald-400 font-medium">
                Detect segments and first chorus/hook timestamps
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
