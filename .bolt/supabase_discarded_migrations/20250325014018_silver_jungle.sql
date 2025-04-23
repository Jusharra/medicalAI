-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own health metrics" ON health_metrics;
    DROP POLICY IF EXISTS "Users can insert own health metrics" ON health_metrics;
    DROP POLICY IF EXISTS "Users can view own messages" ON chat_messages;
    DROP POLICY IF EXISTS "Users can insert messages" ON chat_messages;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Drop existing indexes if they exist
DO $$
BEGIN
    DROP INDEX IF EXISTS idx_health_metrics_profile_id;
    DROP INDEX IF EXISTS idx_health_metrics_type;
    DROP INDEX IF EXISTS idx_health_metrics_measured_at;
    DROP INDEX IF EXISTS idx_chat_messages_user_id;
    DROP INDEX IF EXISTS idx_chat_messages_created_at;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create health_metrics table if it doesn't exist
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
CREATE POLICY "health_metrics_select_policy"
  ON health_metrics
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "health_metrics_insert_policy"
  ON health_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Create policies for chat_messages
CREATE POLICY "chat_messages_select_policy"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "chat_messages_insert_policy"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS health_metrics_profile_id_idx ON health_metrics(profile_id);
CREATE INDEX IF NOT EXISTS health_metrics_type_idx ON health_metrics(metric_type);
CREATE INDEX IF NOT EXISTS health_metrics_measured_at_idx ON health_metrics(measured_at);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at);

-- Insert sample health metrics using separate inserts
DO $$ 
DECLARE 
  profile_record RECORD;
BEGIN
  FOR profile_record IN SELECT id FROM profiles WHERE EXISTS (SELECT 1 FROM auth.users WHERE auth.users.id = profiles.id)
  LOOP
    -- Heart Rate
    INSERT INTO health_metrics (profile_id, metric_type, value, unit, measured_at, notes)
    VALUES (
      profile_record.id,
      'heart_rate',
      75 + floor(random() * 20),
      'bpm',
      now() - (interval '1 day' * floor(random() * 30)),
      'Sample metric'
    );

    -- Blood Pressure
    INSERT INTO health_metrics (profile_id, metric_type, value, unit, measured_at, notes)
    VALUES (
      profile_record.id,
      'blood_pressure',
      120 + floor(random() * 20),
      'mmHg',
      now() - (interval '1 day' * floor(random() * 30)),
      'Sample metric'
    );

    -- Weight
    INSERT INTO health_metrics (profile_id, metric_type, value, unit, measured_at, notes)
    VALUES (
      profile_record.id,
      'weight',
      70 + floor(random() * 30),
      'kg',
      now() - (interval '1 day' * floor(random() * 30)),
      'Sample metric'
    );

    -- Temperature
    INSERT INTO health_metrics (profile_id, metric_type, value, unit, measured_at, notes)
    VALUES (
      profile_record.id,
      'temperature',
      36.5 + random(),
      '°C',
      now() - (interval '1 day' * floor(random() * 30)),
      'Sample metric'
    );
  END LOOP;
END $$;