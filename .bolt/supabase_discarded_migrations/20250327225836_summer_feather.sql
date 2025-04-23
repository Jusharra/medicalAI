/*
  # Fix Authentication and RLS Policies
  
  1. Purpose
    - Enable RLS on profiles table
    - Add proper access policies
    - Grant necessary permissions
    
  2. Changes
    - Drop existing policies
    - Enable RLS
    - Create new policies
    - Grant privileges
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Allow profile inserts for new users" ON public.profiles;
    DROP POLICY IF EXISTS "Allow authenticated read" ON public.profiles;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS on profiles table
ALTER TABLE public.profiles
  ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "profiles_read_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS profiles_id_idx;
DROP INDEX IF EXISTS profiles_username_idx;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS profiles_id_idx ON profiles(id);
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- Grant necessary privileges
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;
GRANT ALL ON public.user_roles TO supabase_auth_admin;
GRANT ALL ON public.role_permissions TO supabase_auth_admin;

-- Verify setup
DO $$
BEGIN
  -- Verify RLS is enabled
  ASSERT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE tablename = 'profiles'
    AND rowsecurity = true
  ), 'RLS is not enabled on profiles table';

  -- Verify policies exist
  ASSERT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'profiles'
    AND policyname IN ('profiles_read_own', 'profiles_update_own', 'profiles_insert_own')
  ), 'Not all required policies exist';

  -- Verify indexes exist
  ASSERT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'profiles'
    AND indexname IN ('profiles_id_idx', 'profiles_username_idx')
  ), 'Not all required indexes exist';
END $$;