/** Base URL for the Fusion FastAPI service (see fusion/README.md). */
export function getFusionApiBase(): string {
  return (import.meta.env.VITE_FUSION_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://127.0.0.1:8000';
}

/** Max upload size for client-side checks (must stay aligned with FUSION_MAX_UPLOAD_MB on the API). */
export function getMaxUploadBytes(): number {
  const raw = import.meta.env.VITE_MAX_UPLOAD_MB;
  const mb = raw != null && raw !== '' ? Number(raw) : 50;
  return (Number.isFinite(mb) && mb > 0 ? mb : 50) * 1024 * 1024;
}

export interface AudioSegment {
  label: string;
  start: number;
  end: number;
}

export interface AnalysisResult {
  filename: string;
  bpm: number | null;
  segments: AudioSegment[];
}

export interface AnalyzePairResponse {
  tracks: [AnalysisResult, AnalysisResult];
}

export class FusionApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = 'FusionApiError';
  }
}

async function parseErrorResponse(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: string | { msg?: string }[] };
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  } catch {
    /* ignore */
  }
  return res.statusText || 'Request failed';
}

/**
 * Analyze two audio files in one request (Fusion API POST /analyze-pair).
 */
export async function analyzePair(fileA: File, fileB: File): Promise<AnalyzePairResponse> {
  const base = getFusionApiBase();
  const form = new FormData();
  form.append('file_a', fileA);
  form.append('file_b', fileB);

  const res = await fetch(`${base}/analyze-pair`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const detail = await parseErrorResponse(res);
    throw new FusionApiError(detail, res.status, detail);
  }

  const data = (await res.json()) as AnalyzePairResponse;
  if (!data.tracks || data.tracks.length !== 2) {
    throw new FusionApiError('Invalid response: expected two tracks');
  }
  return data;
}

/**
 * First chorus-like segment start (seconds). Matches labels containing "chorus" or "hook"
 * (e.g. chorus, chorus_1, hook) per common model output.
 */
export function findFirstChorusStart(segments: AudioSegment[]): number | null {
  const seg = segments.find((s) => {
    const l = s.label.toLowerCase();
    return l.includes('chorus') || l.includes('hook');
  });
  return seg != null ? seg.start : null;
}

/** @deprecated Use findFirstChorusStart; kept for callers matching by arbitrary label */
export function findFirstSegment(segments: AudioSegment[], label: string): number | null {
  const seg = segments.find((s) => s.label.toLowerCase() === label.toLowerCase());
  return seg != null ? seg.start : null;
}
