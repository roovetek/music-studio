import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize2, Upload, Plus, RefreshCw } from 'lucide-react';
import { VideoOverlay } from './VideoOverlay';
import { ReasoningFeed } from './ReasoningFeed';
import { BallTimeline } from './BallTimeline';
import { ScorePanel } from './ScorePanel';
import { useMatchStore } from '../../store/useMatchStore';
import { supabase } from '../../lib/supabase';
import type { ReasoningEntry } from '../../lib/supabase';

interface CricketAnalysisProps {
  onBack: () => void;
}

const DEMO_REASONING_SEQUENCE: ReasoningEntry[] = [
  { message: 'Initializing pose estimation model...', timestamp: 0, type: 'info' },
  { message: 'Detecting player positions in frame', timestamp: 0, type: 'analysis' },
  { message: 'Batsman stance identified: Right-handed, front-on', timestamp: 0, type: 'success' },
  { message: 'Analyzing arm path for delivery classification', timestamp: 0, type: 'analysis' },
  { message: 'Ball release point: 2.1m height, side-on action', timestamp: 0, type: 'info' },
  { message: 'Calculating ball trajectory from release to crease', timestamp: 0, type: 'analysis' },
  { message: 'Estimated delivery speed: 138.4 km/h', timestamp: 0, type: 'success' },
  { message: 'Pitch map: Good length, off-stump line', timestamp: 0, type: 'info' },
  { message: 'Bat swing path detected — square drive attempted', timestamp: 0, type: 'analysis' },
  { message: 'Shot quality score: 8.2/10 — clean connection', timestamp: 0, type: 'success' },
];

const DEMO_BOXES = [
  { x: 80, y: 60, w: 120, h: 300, label: 'Batsman', confidence: 0.97 },
  { x: 480, y: 80, w: 100, h: 260, label: 'Bowler', confidence: 0.94 },
  { x: 290, y: 320, w: 30, h: 30, label: 'Ball', confidence: 0.89 },
];

const DEMO_KEYPOINTS = [
  { x: 140, y: 75, label: 'head' },
  { x: 100, y: 130, label: 'left_shoulder' },
  { x: 180, y: 130, label: 'right_shoulder' },
  { x: 75, y: 195, label: 'left_elbow' },
  { x: 205, y: 180, label: 'right_elbow' },
  { x: 55, y: 255, label: 'left_wrist' },
  { x: 240, y: 240, label: 'right_wrist' },
  { x: 110, y: 240, label: 'left_hip' },
  { x: 170, y: 240, label: 'right_hip' },
  { x: 100, y: 310, label: 'left_knee' },
  { x: 160, y: 310, label: 'right_knee' },
  { x: 95, y: 370, label: 'left_ankle' },
  { x: 165, y: 370, label: 'right_ankle' },
];

const DEMO_TRAJECTORY = [
  { x: 520, y: 130, t: 0 },
  { x: 470, y: 160, t: 1 },
  { x: 420, y: 200, t: 2 },
  { x: 370, y: 250, t: 3 },
  { x: 320, y: 300, t: 4 },
  { x: 295, y: 335, t: 5 },
];

export const CricketAnalysis = ({ onBack }: CricketAnalysisProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoSize, setVideoSize] = useState({ width: 640, height: 360 });
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [showAddDelivery, setShowAddDelivery] = useState(false);

  const {
    activeMatch,
    deliveries,
    reasoningFeed,
    currentTimestamp,
    isAnalyzing,
    activeBoundingBoxes,
    activeSkeletonKeypoints,
    activeTrajectoryPoints,
    isOnline,
    pendingSyncCount,
    setCurrentTimestamp,
    setIsAnalyzing,
    setActiveOverlayData,
    clearOverlayData,
    appendReasoning,
    clearReasoning,
    getTotalRuns,
    getTotalWickets,
    setIsOnline,
    addDelivery,
    incrementPendingSync,
    decrementPendingSync,
  } = useMatchStore();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (videoContainerRef.current) {
        const { clientWidth, clientHeight } = videoContainerRef.current;
        setVideoSize({ width: clientWidth, height: clientHeight });
      }
    });
    if (videoContainerRef.current) observer.observe(videoContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTimestamp(t);
    setProgress(t / (videoRef.current.duration || 1));
  }, [setCurrentTimestamp]);

  const handleSeek = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      setProgress(seconds / (videoRef.current.duration || 1));
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const runDemoAnalysis = useCallback(async () => {
    clearReasoning();
    clearOverlayData();
    setIsAnalyzing(true);

    for (let i = 0; i < DEMO_REASONING_SEQUENCE.length; i++) {
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
      appendReasoning({
        ...DEMO_REASONING_SEQUENCE[i],
        timestamp: Date.now(),
      });
    }

    setActiveOverlayData(DEMO_BOXES, DEMO_KEYPOINTS, DEMO_TRAJECTORY);
    setIsAnalyzing(false);
  }, [clearReasoning, clearOverlayData, setIsAnalyzing, appendReasoning, setActiveOverlayData]);

  const handleVideoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setIsPlaying(false);
    clearOverlayData();
    clearReasoning();
  }, [clearOverlayData, clearReasoning]);

  const handleAddDemoDelivery = useCallback(async () => {
    const demoDelivery = {
      id: crypto.randomUUID(),
      match_id: activeMatch?.id ?? 'demo',
      over_number: Math.floor(deliveries.length / 6),
      ball_number: (deliveries.length % 6) + 1,
      batsman: 'V. Kohli',
      bowler: 'J. Bumrah',
      runs: [0, 1, 2, 4, 6][Math.floor(Math.random() * 5)],
      extras: 0,
      wicket: Math.random() < 0.1,
      wicket_type: null,
      shot_type: ['Cover Drive', 'Pull Shot', 'Flick', 'Cut Shot', 'Straight Drive'][Math.floor(Math.random() * 5)],
      ball_speed_kmh: Math.round(130 + Math.random() * 20),
      timestamp_seconds: currentTimestamp,
      created_at: new Date().toISOString(),
    };

    addDelivery(demoDelivery);

    if (isOnline && activeMatch) {
      try {
        incrementPendingSync();
        await supabase.from('deliveries').insert({
          match_id: demoDelivery.match_id,
          over_number: demoDelivery.over_number,
          ball_number: demoDelivery.ball_number,
          batsman: demoDelivery.batsman,
          bowler: demoDelivery.bowler,
          runs: demoDelivery.runs,
          extras: demoDelivery.extras,
          wicket: demoDelivery.wicket,
          shot_type: demoDelivery.shot_type,
          ball_speed_kmh: demoDelivery.ball_speed_kmh,
          timestamp_seconds: demoDelivery.timestamp_seconds,
        });
        decrementPendingSync();
      } catch {
        decrementPendingSync();
      }
    }

    appendReasoning({
      message: `Delivery logged: ${demoDelivery.runs} runs — ${demoDelivery.shot_type}`,
      timestamp: Date.now(),
      type: 'success',
    });
  }, [activeMatch, deliveries.length, currentTimestamp, isOnline, addDelivery, appendReasoning, incrementPendingSync, decrementPendingSync]);

  const progressPercent = progress * 100;

  return (
    <div className="w-full min-h-screen flex flex-col gap-4 p-4 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="h-5 w-px bg-slate-700" />
        <h1 className="text-white font-bold text-lg tracking-tight">Cricket AI Analysis</h1>
        <div className="ml-auto">
          <ScorePanel
            match={activeMatch}
            totalRuns={getTotalRuns()}
            totalWickets={getTotalWickets()}
            deliveryCount={deliveries.length}
            isOnline={isOnline}
            pendingSyncCount={pendingSyncCount}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 flex-1">
        <div className="flex flex-col gap-4">
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div
              ref={videoContainerRef}
              className="relative bg-slate-950 w-full"
              style={{ aspectRatio: '16/9' }}
            >
              {videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="w-full h-full object-cover"
                  muted={isMuted}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={() => {
                    if (videoRef.current) setDuration(videoRef.current.duration);
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-slate-500 text-sm">Upload a video to begin analysis</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-colors"
                  >
                    Choose Video
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoUpload}
                  />
                </div>
              )}

              <VideoOverlay
                boundingBoxes={activeBoundingBoxes}
                skeletonKeypoints={activeSkeletonKeypoints}
                trajectoryPoints={activeTrajectoryPoints}
                width={videoSize.width}
                height={videoSize.height}
              />

              {isAnalyzing && (
                <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/40 backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-xs text-cyan-300 font-medium">AI Analyzing</span>
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              <div
                className="w-full h-1.5 bg-slate-800 rounded-full cursor-pointer relative group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  handleSeek(ratio * duration);
                }}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `calc(${progressPercent}% - 6px)` }}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  disabled={!videoSrc}
                  className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center hover:bg-blue-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  disabled={!videoSrc}
                  className="w-9 h-9 rounded-full bg-slate-800/60 border border-slate-700/40 text-slate-400 flex items-center justify-center hover:bg-slate-700/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <span className="text-xs font-mono text-slate-500 ml-1">
                  {Math.floor(currentTimestamp / 60)}:{String(Math.floor(currentTimestamp % 60)).padStart(2, '0')}
                  {' / '}
                  {Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}
                </span>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={runDemoAnalysis}
                    disabled={isAnalyzing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Run AI Analysis
                  </button>

                  <button
                    onClick={handleAddDemoDelivery}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Log Delivery
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 rounded-full bg-slate-800/60 border border-slate-700/40 text-slate-400 flex items-center justify-center hover:bg-slate-700/60 transition-colors"
                    title="Upload video"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoUpload}
                  />

                  <button className="w-9 h-9 rounded-full bg-slate-800/60 border border-slate-700/40 text-slate-400 flex items-center justify-center hover:bg-slate-700/60 transition-colors">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-4" style={{ height: '220px' }}>
            <BallTimeline
              deliveries={deliveries}
              currentTimestamp={currentTimestamp}
              onSeek={handleSeek}
            />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-4 flex flex-col" style={{ height: 'calc(100vh - 140px)', minHeight: '500px' }}>
          <ReasoningFeed entries={reasoningFeed} isAnalyzing={isAnalyzing} />
        </div>
      </div>

      {showAddDelivery && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-panel rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-semibold mb-4">Log Delivery</h3>
            <button
              onClick={() => setShowAddDelivery(false)}
              className="mt-4 w-full py-2 rounded-xl bg-slate-800 text-slate-400 text-sm hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
