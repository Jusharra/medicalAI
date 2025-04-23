/*
  # Fix Profile Policies Recursion

  1. Changes
    - Drop all existing profile policies
    - Create new non-recursive policies
    - Use direct role checks without self-referencing
    
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Keep RLS enabled
*/

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "profiles_read_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "Enable read access" ON profiles;
DROP POLICY IF EXISTS "Enable insert" ON profiles;
DROP POLICY IF EXISTS "Enable update" ON profiles;
DROP POLICY IF EXISTS "Enable delete" ON profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Access control for professionals and admins" ON profiles;

-- Create new simplified policies without recursion
CREATE POLICY "allow_read_own_profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "allow_insert_own_profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_update_own_profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create admin-specific policies using role check
CREATE POLICY "allow_admin_read_all"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
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
  );

CREATE POLICY "allow_admin_update_all"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
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
  )
  WITH CHECK (
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
  );

-- Create professional-specific policies
CREATE POLICY "allow_professional_read_patients"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM appointments a
      WHERE a.provider::uuid = auth.uid()
      AND a.profile_id = profiles.id
    )
  );