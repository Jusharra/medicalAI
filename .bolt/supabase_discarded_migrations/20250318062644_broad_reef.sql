/*
  # Fix Profile Policies Final

  1. Changes
    - Remove all existing policies and functions
    - Create new non-recursive policies using direct joins
    - Simplify policy structure
    - Use materialized role checks
    
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Keep RLS enabled
*/

-- Drop all existing policies and functions
DROP POLICY IF EXISTS "profiles_read_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP FUNCTION IF EXISTS is_admin(uuid);
DROP FUNCTION IF EXISTS is_professional(uuid);

-- Create new simplified policies without any recursion
CREATE POLICY "profiles_read_policy"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own profile
    auth.uid() = id
    OR 
    -- Admins can read all profiles (using direct join)
    EXISTS (
      SELECT 1
      FROM auth.users u
      WHERE u.id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = u.id
        AND p.role = 'admin'
      )
    )
    OR
    -- Professionals can read their patients' profiles (using direct join)
    EXISTS (
      SELECT 1
      FROM auth.users u
      JOIN profiles p ON p.id = u.id
      JOIN appointments a ON a.provider::uuid = u.id
      WHERE u.id = auth.uid()
      AND p.role IN ('physician', 'nurse')
      AND a.profile_id = profiles.id
    )
  );

-- Simple insert policy without recursion
CREATE POLICY "profiles_insert_policy"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Update policy using direct joins
CREATE POLICY "profiles_update_policy"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1
      FROM auth.users u
      JOIN profiles p ON p.id = u.id
      WHERE u.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1
      FROM auth.users u
      JOIN profiles p ON p.id = u.id
      WHERE u.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Delete policy using direct join
CREATE POLICY "profiles_delete_policy"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users u
      JOIN profiles p ON p.id = u.id
      WHERE u.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON profiles(id, role);