import { useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import type { BoundingBox, SkeletonKeypoint, TrajectoryPoint } from '../../lib/supabase';

export const DEFAULT_CRICKET_API_URL = 'http://127.0.0.1:8002';

function apiToWsBase(apiUrl: string): string {
  if (apiUrl.startsWith('https://')) return `wss://${apiUrl.slice('https://'.length)}`;
  if (apiUrl.startsWith('http://')) return `ws://${apiUrl.slice('http://'.length)}`;
  return apiUrl;
}

export interface TelemetryMessage {
  schema_version: number;
  frame_width?: number;
  frame_height?: number;
  frame_index?: number;
  keypoints?: Array<{ x: number; y: number; label: string; person_id?: number }>;
  bounding_boxes?: BoundingBox[];
  trajectory?: TrajectoryPoint[];
  rules?: Record<string, unknown>;
  reasoning?: string;
  error?: string;
  event?: string;
}

function scaleTelemetry(
  msg: TelemetryMessage,
  displayW: number,
  displayH: number
): {
  boxes: BoundingBox[];
  keypoints: SkeletonKeypoint[];
  trajectory: TrajectoryPoint[];
} {
  const fw = msg.frame_width ?? 1;
  const fh = msg.frame_height ?? 1;
  const sx = displayW / fw;
  const sy = displayH / fh;

  const boxes = (msg.bounding_boxes ?? []).map((b) => ({
    ...b,
    x: b.x * sx,
    y: b.y * sy,
    w: b.w * sx,
    h: b.h * sy,
  }));

  const keypoints: SkeletonKeypoint[] = (msg.keypoints ?? []).map((k) => ({
    x: k.x * sx,
    y: k.y * sy,
    label: k.label,
  }));

  const trajectory = (msg.trajectory ?? []).map((p) => ({
    x: p.x * sx,
    y: p.y * sy,
    t: p.t,
  }));

  return { boxes, keypoints, trajectory };
}

export function useCricketVisionStream(options: {
  file: File | null;
  videoSize: { width: number; height: number };
  /** Increment to start a new upload/stream;0 disables. */
  streamKey: number;
  onOverlay: (boxes: BoundingBox[], keypoints: SkeletonKeypoint[], trajectory: TrajectoryPoint[]) => void;
  onReasoning: (text: string) => void;
  onAnalyzing: (v: boolean) => void;
  onStreamEnd?: () => void;
  apiUrl?: string;
}) {
  const {
    file,
    videoSize,
    streamKey,
    onOverlay,
    onReasoning,
    onAnalyzing,
    onStreamEnd,
    apiUrl = import.meta.env.VITE_CRICKET_API_URL ?? DEFAULT_CRICKET_API_URL,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const lastReasoningRef = useRef('');
  const videoSizeRef = useRef(videoSize);
  const onOverlayRef = useRef(onOverlay);
  const onReasoningRef = useRef(onReasoning);
  const onAnalyzingRef = useRef(onAnalyzing);
  const onStreamEndRef = useRef(onStreamEnd);

  useLayoutEffect(() => {
    videoSizeRef.current = videoSize;
  }, [videoSize.width, videoSize.height]);
  useLayoutEffect(() => {
    onOverlayRef.current = onOverlay;
  }, [onOverlay]);
  useLayoutEffect(() => {
    onReasoningRef.current = onReasoning;
  }, [onReasoning]);
  useLayoutEffect(() => {
    onAnalyzingRef.current = onAnalyzing;
  }, [onAnalyzing]);
  useLayoutEffect(() => {
    onStreamEndRef.current = onStreamEnd;
  }, [onStreamEnd]);

  const stop = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    onAnalyzingRef.current(false);
  }, []);

  useEffect(() => {
    if (streamKey === 0 || !file) {
      stop();
      return;
    }

    let cancelled = false;
    const wsBase =
      import.meta.env.VITE_CRICKET_WS_URL?.replace(/\/$/, '') ?? apiToWsBase(apiUrl.replace(/\/$/, ''));

    (async () => {
      onAnalyzingRef.current(true);
      lastReasoningRef.current = '';
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(`${apiUrl.replace(/\/$/, '')}/sessions`, {
          method: 'POST',
          body: form,
        });
        if (!res.ok) {
          const err = await res.text();
          onReasoningRef.current(`Backend error ${res.status}: ${err || res.statusText}`);
          onAnalyzingRef.current(false);
          return;
        }
        const data = (await res.json()) as { session_id: string; ws_path: string; websocket_url?: string };
        if (cancelled) return;

        let wsUrl = data.websocket_url ?? `${wsBase}${data.ws_path}`;
        if (wsUrl.startsWith('http://')) wsUrl = `ws://${wsUrl.slice('http://'.length)}`;
        if (wsUrl.startsWith('https://')) wsUrl = `wss://${wsUrl.slice('https://'.length)}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data as string) as TelemetryMessage;
            if (msg.error) {
              onReasoningRef.current(`Stream error: ${msg.error}`);
              return;
            }
            if (msg.event === 'stream_end') {
              onAnalyzingRef.current(false);
              onStreamEndRef.current?.();
              return;
            }
            if (msg.schema_version !== 1 || msg.frame_width == null) return;

            const { width, height } = videoSizeRef.current;
            const { boxes, keypoints, trajectory } = scaleTelemetry(msg, width, height);
            onOverlayRef.current(boxes, keypoints, trajectory);

            const r = msg.reasoning?.trim() ?? '';
            if (r && r !== lastReasoningRef.current) {
              lastReasoningRef.current = r;
              onReasoningRef.current(r);
            }
          } catch {
            /* ignore malformed */
          }
        };

        ws.onerror = () => {
          onReasoningRef.current('WebSocket error — is the Cricket API running on port 8002?');
          onAnalyzingRef.current(false);
        };

        ws.onclose = () => {
          wsRef.current = null;
          onAnalyzingRef.current(false);
        };
      } catch (e) {
        onReasoningRef.current(`Failed to start stream: ${e instanceof Error ? e.message : String(e)}`);
        onAnalyzingRef.current(false);
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [streamKey, file, apiUrl, stop]);

  return { stop };
}
