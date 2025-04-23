/*
  # Fix User Preferences Table Migration

  1. Changes
    - Check if table and policies exist before creating them
    - Use IF NOT EXISTS for all policy creation statements
    - Ensure proper error handling
*/

-- Check if the table exists before creating it
DO $$ 
BEGIN
    -- Create user_preferences table if it doesn't exist
    CREATE TABLE IF NOT EXISTS user_preferences (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      email_notifications boolean DEFAULT true,
      sms_notifications boolean DEFAULT true,
      marketing_emails boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT user_preferences_user_id_key UNIQUE (user_id)
    );
    
    -- Enable RLS if not already enabled
    ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
    
EXCEPTION
    WHEN duplicate_table THEN
        -- Table already exists, do nothing
        NULL;
END $$;

-- Drop existing policies if they exist to avoid conflicts
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "preferences_read_own" ON user_preferences;
    DROP POLICY IF EXISTS "preferences_insert_own" ON user_preferences;
    DROP POLICY IF EXISTS "preferences_update_own" ON user_preferences;
EXCEPTION
    WHEN undefined_object THEN
        -- Policy doesn't exist, do nothing
        NULL;
END $$;

-- Create policies
CREATE POLICY "preferences_read_own"
  ON user_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "preferences_insert_own"
  ON user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "preferences_update_own"
  ON user_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;

-- Create trigger to update updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for better query performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Add missing preferences for existing users
INSERT INTO user_preferences (user_id)
SELECT id
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_preferences WHERE user_preferences.user_id = auth.users.id
)
ON CONFLICT (user_id) DO NOTHING;