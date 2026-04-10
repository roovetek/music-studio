import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Optional: only created when both env vars are set. Cricket + local AI work without it. */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export interface Match {
  id: string;
  title: string;
  team_home: string;
  team_away: string;
  venue: string;
  match_date: string | null;
  status: 'live' | 'completed' | 'scheduled';
  video_url: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Delivery {
  id: string;
  match_id: string;
  over_number: number;
  ball_number: number;
  batsman: string;
  bowler: string;
  runs: number;
  extras: number;
  wicket: boolean;
  wicket_type: string | null;
  shot_type: string | null;
  ball_speed_kmh: number | null;
  timestamp_seconds: number;
  created_at: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  confidence: number;
}

export interface SkeletonKeypoint {
  x: number;
  y: number;
  label: string;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  t: number;
}

export interface ReasoningEntry {
  message: string;
  timestamp: number;
  type: 'info' | 'warning' | 'success' | 'analysis';
}

export interface AIMetadata {
  id: string;
  delivery_id: string | null;
  match_id: string;
  analysis_type: 'pose' | 'trajectory' | 'pitch_map' | 'bat_swing';
  bounding_boxes: BoundingBox[];
  skeleton_keypoints: SkeletonKeypoint[];
  trajectory_points: TrajectoryPoint[];
  reasoning_log: ReasoningEntry[];
  confidence_score: number;
  created_at: string;
}
