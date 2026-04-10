/*
  # Cricket AI Analysis Schema

  ## Overview
  Creates the full schema for the Cricket AI Analysis Dashboard, supporting
  offline-first match tracking, delivery-by-delivery logging, and AI metadata.

  ## New Tables

  ### 1. matches
  - `id` (uuid, primary key)
  - `title` (text) - Match name/description
  - `team_home` (text) - Home team name
  - `team_away` (text) - Away team name
  - `venue` (text) - Match venue
  - `match_date` (date) - Date of the match
  - `status` (text) - 'live', 'completed', 'scheduled'
  - `video_url` (text) - URL to the match video
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. deliveries
  - `id` (uuid, primary key)
  - `match_id` (uuid, FK to matches)
  - `over_number` (int) - Over index (0-based)
  - `ball_number` (int) - Ball in over (1-6 + extras)
  - `batsman` (text) - Batsman name
  - `bowler` (text) - Bowler name
  - `runs` (int) - Runs scored on delivery
  - `extras` (int) - Extra runs (wides, no-balls)
  - `wicket` (boolean) - Whether a wicket fell
  - `wicket_type` (text) - Type of dismissal
  - `shot_type` (text) - Shot played
  - `ball_speed_kmh` (numeric) - Recorded ball speed
  - `timestamp_seconds` (numeric) - Seek position in video
  - `created_at` (timestamptz)

  ### 3. ai_metadata
  - `id` (uuid, primary key)
  - `delivery_id` (uuid, FK to deliveries)
  - `match_id` (uuid, FK to matches)
  - `analysis_type` (text) - 'pose', 'trajectory', 'pitch_map', 'bat_swing'
  - `bounding_boxes` (jsonb) - Array of {x, y, w, h, label, confidence}
  - `skeleton_keypoints` (jsonb) - Array of {x, y, label}
  - `trajectory_points` (jsonb) - Array of {x, y, t}
  - `reasoning_log` (jsonb) - Array of {message, timestamp, type}
  - `confidence_score` (numeric) - Overall AI confidence 0-1
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Authenticated users can read/write their own data
  - Public read access for matches (for demo purposes)
*/

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  team_home text NOT NULL DEFAULT '',
  team_away text NOT NULL DEFAULT '',
  venue text NOT NULL DEFAULT '',
  match_date date,
  status text NOT NULL DEFAULT 'scheduled',
  video_url text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert matches"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view own matches"
  ON matches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own matches"
  ON matches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete own matches"
  ON matches FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  over_number int NOT NULL DEFAULT 0,
  ball_number int NOT NULL DEFAULT 1,
  batsman text NOT NULL DEFAULT '',
  bowler text NOT NULL DEFAULT '',
  runs int NOT NULL DEFAULT 0,
  extras int NOT NULL DEFAULT 0,
  wicket boolean NOT NULL DEFAULT false,
  wicket_type text,
  shot_type text,
  ball_speed_kmh numeric,
  timestamp_seconds numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert deliveries for own matches"
  ON deliveries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND matches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view deliveries for own matches"
  ON deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND matches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update deliveries for own matches"
  ON deliveries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND matches.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND matches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete deliveries for own matches"
  ON deliveries FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND matches.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS ai_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid REFERENCES deliveries(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  analysis_type text NOT NULL DEFAULT 'pose',
  bounding_boxes jsonb DEFAULT '[]'::jsonb,
  skeleton_keypoints jsonb DEFAULT '[]'::jsonb,
  trajectory_points jsonb DEFAULT '[]'::jsonb,
  reasoning_log jsonb DEFAULT '[]'::jsonb,
  confidence_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert ai_metadata for own matches"
  ON ai_metadata FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND matches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view ai_metadata for own matches"
  ON ai_metadata FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND matches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update ai_metadata for own matches"
  ON ai_metadata FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND matches.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND matches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete ai_metadata for own matches"
  ON ai_metadata FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND matches.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS deliveries_match_id_idx ON deliveries(match_id);
CREATE INDEX IF NOT EXISTS deliveries_timestamp_idx ON deliveries(timestamp_seconds);
CREATE INDEX IF NOT EXISTS ai_metadata_match_id_idx ON ai_metadata(match_id);
CREATE INDEX IF NOT EXISTS ai_metadata_delivery_id_idx ON ai_metadata(delivery_id);
