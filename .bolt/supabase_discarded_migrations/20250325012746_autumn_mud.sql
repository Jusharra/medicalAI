/*
  # Add Health Metrics and Alerts Schema
  
  1. New Tables
    - health_metrics
      - Store health measurements and vital signs
      - Track metrics over time
      - Enable trend analysis
    
    - chat_messages
      - Store chat interactions for symptom analysis
      - Track health-related discussions
      
  2. Security
    - Enable RLS
    - Add policies for user access
*/

-- Create health_metrics table
CREATE TABLE IF NOT EXISTS health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  measured_at timestamptz NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for health_metrics
CREATE POLICY "Users can view own health metrics"
  ON health_metrics
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own health metrics"
  ON health_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Create policies for chat_messages
CREATE POLICY "Users can view own messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_health_metrics_profile_id ON health_metrics(profile_id);
CREATE INDEX idx_health_metrics_type ON health_metrics(metric_type);
CREATE INDEX idx_health_metrics_measured_at ON health_metrics(measured_at);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Insert sample health metrics using a more reliable approach
WITH metric_types AS (
  SELECT 
    unnest(ARRAY['heart_rate', 'blood_pressure', 'weight', 'temperature']) as type,
    unnest(ARRAY[75, 120, 70, 36.5]) as base_value,
    unnest(ARRAY['bpm', 'mmHg', 'kg', '°C']) as unit
)
INSERT INTO health_metrics (
  profile_id,
  metric_type,
  value,
  unit,
  measured_at,
  notes
)
SELECT
  p.id as profile_id,
  m.type as metric_type,
  m.base_value + (random() * 20)::numeric as value,
  m.unit,
  now() - (interval '1 day' * floor(random() * 30)) as measured_at,
  'Sample metric'
FROM profiles p
CROSS JOIN metric_types m
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE auth.users.id = p.id
)
ON CONFLICT DO NOTHING;