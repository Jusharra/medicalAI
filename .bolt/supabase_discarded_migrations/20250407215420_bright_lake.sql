/*
  # Create Call Reports Tables

  1. New Tables
    - `call_reports`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, foreign key to profiles)
      - `call_duration` (integer)
      - `call_date` (timestamp)
      - `ai_agent_id` (text)
      - `satisfaction_rating` (integer)
      - `topics_discussed` (text[])
      - `follow_up_required` (boolean)
      - `follow_up_notes` (text)
      - `call_summary` (text)
      - `sentiment_analysis` (jsonb)
      - `created_at` (timestamp)

    - `call_reports_summary`
      - `id` (uuid, primary key)
      - `report_date` (date)
      - `total_calls` (integer)
      - `avg_duration_seconds` (integer)
      - `avg_satisfaction` (numeric)
      - `follow_ups_needed` (integer)
      - `agent_usage` (jsonb)
      - `topics` (text[])
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create call_reports table
CREATE TABLE IF NOT EXISTS call_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  call_duration integer NOT NULL DEFAULT 0,
  call_date timestamp with time zone NOT NULL DEFAULT now(),
  ai_agent_id text NOT NULL,
  satisfaction_rating integer NOT NULL CHECK (satisfaction_rating BETWEEN 1 AND 5),
  topics_discussed text[] NOT NULL DEFAULT '{}',
  follow_up_required boolean NOT NULL DEFAULT false,
  follow_up_notes text,
  call_summary text,
  sentiment_analysis jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Create call_reports_summary table
CREATE TABLE IF NOT EXISTS call_reports_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL,
  total_calls integer NOT NULL DEFAULT 0,
  avg_duration_seconds integer NOT NULL DEFAULT 0,
  avg_satisfaction numeric NOT NULL DEFAULT 0,
  follow_ups_needed integer NOT NULL DEFAULT 0,
  agent_usage jsonb NOT NULL DEFAULT '{}',
  topics text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE call_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_reports_summary ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_call_reports_profile_id ON call_reports(profile_id);
CREATE INDEX IF NOT EXISTS idx_call_reports_call_date ON call_reports(call_date DESC);
CREATE INDEX IF NOT EXISTS idx_call_reports_ai_agent_id ON call_reports(ai_agent_id);
CREATE INDEX IF NOT EXISTS idx_call_reports_summary_report_date ON call_reports_summary(report_date DESC);

-- Create policies for call_reports
CREATE POLICY "Users can view their own call reports"
  ON call_reports
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage all call reports"
  ON call_reports
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create policies for call_reports_summary
CREATE POLICY "Admins can view call reports summary"
  ON call_reports_summary
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage call reports summary"
  ON call_reports_summary
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');