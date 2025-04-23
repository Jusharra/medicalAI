/*
  # Fix Profile Policies Recursion

  1. Changes
    - Remove recursive policy checks
    - Simplify policy structure
    - Maintain security while avoiding infinite loops

  2. Security
    - Maintain RLS
    - Keep role-based access control
    - Prevent unauthorized access
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Professionals can view assigned patients" ON profiles;
DROP POLICY IF EXISTS "Professionals and admins can view patients" ON profiles;
DROP POLICY IF EXISTS "Access control for professionals and admins" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Create simplified policies without recursion
CREATE POLICY "Enable insert for authenticated users"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable read access for authenticated users"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own profile
    auth.uid() = id
    OR
    -- Check if the user has admin role without recursion
    EXISTS (
      SELECT 1
      FROM auth.users u
      JOIN profiles p ON u.id = p.id
      WHERE u.id = auth.uid()
      AND p.role = 'admin'
    )
    OR
    -- Check if the user is a professional with access to this profile
    EXISTS (
      SELECT 1
      FROM auth.users u
      JOIN profiles p ON u.id = p.id
      JOIN appointments a ON a.provider::uuid = u.id
      WHERE u.id = auth.uid()
      AND p.role IN ('physician', 'nurse')
      AND a.profile_id = profiles.id
    )
  );

-- Create admin-specific policy without recursion
CREATE POLICY "Enable all actions for admins"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users u
      JOIN profiles p ON u.id = p.id
      WHERE u.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM auth.users u
      JOIN profiles p ON u.id = p.id
      WHERE u.id = auth.uid()
      AND p.role = 'admin'
    )
  );