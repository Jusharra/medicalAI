/*
  # Fix Account and Profile Settings Access

  1. Changes
    - Update RLS policies to allow all authenticated users to access their own profile and account settings
    - Remove role-based restrictions for basic profile operations
    - Keep admin access for system-wide operations

  2. Security
    - Maintain user data isolation
    - Allow users to manage their own profiles
    - Preserve admin capabilities
*/

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Create new simplified policies
CREATE POLICY "profiles_read_own"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can always read their own profile
    id = auth.uid()
  );

CREATE POLICY "profiles_insert_own"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can create their own profile
    id = auth.uid()
  );

CREATE POLICY "profiles_update_own"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own profile
    id = auth.uid()
  )
  WITH CHECK (
    -- Users can only update their own profile
    id = auth.uid()
  );

-- Update users table policies
DROP POLICY IF EXISTS "users_read_access" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

CREATE POLICY "users_read_access"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Users can always read their own data
    id = auth.uid() OR
    -- Admins can read all data
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "users_update_own"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own basic info
    id = auth.uid()
  )
  WITH CHECK (
    -- Users can only update their own data
    id = auth.uid()
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);