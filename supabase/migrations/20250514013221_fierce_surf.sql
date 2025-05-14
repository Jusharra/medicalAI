-- Add avatar_url column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  action text,
  table_name text,
  record_id uuid,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb
);

-- Create indexes for logs table
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_action ON logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_table_name ON logs(table_name);

-- Enable RLS on logs table
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Create policies for logs table
-- PostgreSQL doesn't support IF NOT EXISTS for policies
-- First drop existing policies if they exist
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can access logs" ON logs;
    DROP POLICY IF EXISTS "Allow all inserts for logging" ON logs;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Create policies for logs table
CREATE POLICY "Admins can access logs"
  ON logs
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'admin');

CREATE POLICY "Allow all inserts for logging"
  ON logs
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

-- Ensure profiles table has necessary columns
DO $$
BEGIN
  -- Check if profiles table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    -- Add full_name column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles' 
                  AND column_name = 'full_name') THEN
      ALTER TABLE profiles ADD COLUMN full_name text;
    END IF;
    
    -- Add avatar_url column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles' 
                  AND column_name = 'avatar_url') THEN
      ALTER TABLE profiles ADD COLUMN avatar_url text;
    END IF;
  ELSE
    -- Create profiles table if it doesn't exist
    CREATE TABLE profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name text,
      avatar_url text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    
    -- Enable RLS
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create or update policies for profiles table
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();