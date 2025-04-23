/*
  # Add Engagement Tracking with Triggers
  
  1. Purpose
    - Track user engagement metrics
    - Store analytics events
    - Log member activity
    - Calculate engagement scores via triggers
    
  2. Changes
    - Create engagement tracking tables
    - Add engagement score column
    - Use triggers for calculations
*/

-- Create engagement_metrics table
CREATE TABLE IF NOT EXISTS engagement_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  metric_type text NOT NULL CHECK (metric_type IN ('chat', 'appointment', 'assessment', 'login')),
  value numeric NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb,
  session_id text,
  created_at timestamptz DEFAULT now()
);

-- Create member_activity_log table
CREATE TABLE IF NOT EXISTS member_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  details text,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Add engagement_score to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS engagement_score numeric DEFAULT 0;

-- Enable RLS
ALTER TABLE engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_activity_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own engagement metrics"
  ON engagement_metrics
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can view own analytics events"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can view own activity log"
  ON member_activity_log
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_profile ON engagement_metrics(profile_id);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_type ON engagement_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_profile ON analytics_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_member_activity_profile ON member_activity_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_member_activity_type ON member_activity_log(activity_type);

-- Create function to log member activity
CREATE OR REPLACE FUNCTION log_member_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO member_activity_log (
    profile_id,
    activity_type,
    details,
    ip_address,
    user_agent
  ) VALUES (
    NEW.profile_id,
    TG_ARGV[0],
    NEW.details,
    current_setting('request.headers')::json->>'x-forwarded-for',
    current_setting('request.headers')::json->>'user-agent'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(profile_uuid uuid)
RETURNS numeric AS $$
DECLARE
  chat_count integer;
  appointment_count integer;
  assessment_count integer;
  login_count integer;
BEGIN
  SELECT 
    COUNT(*) FILTER (WHERE metric_type = 'chat'),
    COUNT(*) FILTER (WHERE metric_type = 'appointment'),
    COUNT(*) FILTER (WHERE metric_type = 'assessment'),
    COUNT(*) FILTER (WHERE metric_type = 'login')
  INTO chat_count, appointment_count, assessment_count, login_count
  FROM engagement_metrics
  WHERE profile_id = profile_uuid;

  RETURN (
    COALESCE(chat_count, 0) * 2 +
    COALESCE(appointment_count, 0) * 5 +
    COALESCE(assessment_count, 0) * 3 +
    COALESCE(login_count, 0)
  ) / 10.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to update engagement score
CREATE OR REPLACE FUNCTION update_engagement_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET engagement_score = calculate_engagement_score(NEW.profile_id)
  WHERE id = NEW.profile_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update engagement score
CREATE TRIGGER update_engagement_score_on_metric
  AFTER INSERT OR UPDATE ON engagement_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_engagement_score();

-- Create analytics view
CREATE OR REPLACE VIEW member_engagement_summary AS
SELECT
  p.id as profile_id,
  p.first_name,
  p.last_name,
  COUNT(DISTINCT CASE WHEN em.metric_type = 'chat' THEN em.id END) as chat_count,
  COUNT(DISTINCT CASE WHEN em.metric_type = 'appointment' THEN em.id END) as appointment_count,
  COUNT(DISTINCT CASE WHEN em.metric_type = 'assessment' THEN em.id END) as assessment_count,
  COUNT(DISTINCT CASE WHEN em.metric_type = 'login' THEN em.id END) as login_count,
  AVG(em.value) as avg_engagement_score,
  MAX(em.created_at) as last_activity,
  p.engagement_score as current_score
FROM profiles p
LEFT JOIN engagement_metrics em ON p.id = em.profile_id
GROUP BY p.id, p.first_name, p.last_name, p.engagement_score;