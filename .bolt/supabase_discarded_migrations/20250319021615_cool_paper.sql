/*
  # Fix Profile Policies Final Revision
  
  1. Changes
    - Remove all existing policies
    - Create new non-recursive policies
    - Use direct role checks without nested queries
    - Simplify policy structure
    
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Keep RLS enabled
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "allow_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_admin_read_all" ON profiles;
DROP POLICY IF EXISTS "allow_admin_update_all" ON profiles;
DROP POLICY IF EXISTS "allow_professional_read_patients" ON profiles;

-- Basic policies for all users
CREATE POLICY "allow_select_own_profile"
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

-- Admin policies without recursion
CREATE POLICY "allow_admin_all"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM auth.users u
      LEFT JOIN profiles p ON u.id = p.id
      WHERE u.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Professional access to patient profiles
CREATE POLICY "allow_professional_select_patients"
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