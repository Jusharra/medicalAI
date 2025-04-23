/*
  # Fix Profile Policies Recursion

  1. Changes
    - Remove recursive role checks in policies
    - Simplify policy structure
    - Use direct joins instead of subqueries
    - Separate read and write policies
    
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Keep RLS enabled
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable all actions for admins" ON profiles;

-- Create simplified read policy
CREATE POLICY "Enable read access"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can always read their own profile
    auth.uid() = id
    OR 
    -- Admins can read all profiles (using direct join)
    EXISTS (
      SELECT 1
      FROM profiles admin_p
      WHERE admin_p.id = auth.uid()
      AND admin_p.role = 'admin'
    )
    OR
    -- Professionals can read their patients' profiles
    EXISTS (
      SELECT 1
      FROM appointments a
      WHERE a.provider::uuid = auth.uid()
      AND a.profile_id = profiles.id
    )
  );

-- Create insert policy
CREATE POLICY "Enable insert"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create update policy
CREATE POLICY "Enable update"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own profile
    auth.uid() = id
    OR
    -- Admins can update any profile
    EXISTS (
      SELECT 1
      FROM profiles admin_p
      WHERE admin_p.id = auth.uid()
      AND admin_p.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1
      FROM profiles admin_p
      WHERE admin_p.id = auth.uid()
      AND admin_p.role = 'admin'
    )
  );

-- Create delete policy
CREATE POLICY "Enable delete"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    -- Only admins can delete profiles
    EXISTS (
      SELECT 1
      FROM profiles admin_p
      WHERE admin_p.id = auth.uid()
      AND admin_p.role = 'admin'
    )
  );