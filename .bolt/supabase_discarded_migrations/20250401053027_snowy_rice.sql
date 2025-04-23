-- Drop all existing auth-related tables and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.store_role_in_users();
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;

-- Enable RLS on auth.users if not already enabled
DO $$ 
BEGIN
  ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN feature_not_supported THEN 
    NULL;  -- RLS already enabled
END $$;

-- Drop existing policy if it exists
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can read own auth data" ON auth.users;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create policy for auth.users
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'auth' 
    AND tablename = 'users' 
    AND policyname = 'Users can read own auth data'
  ) THEN
    CREATE POLICY "Users can read own auth data"
      ON auth.users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;