/*
  # Fix Authentication Policies
  
  1. Changes
    - Remove all recursive policies
    - Implement direct role checks
    - Simplify policy structure
    - Add indexes for performance
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "allow_select_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_admin_all" ON profiles;
DROP POLICY IF EXISTS "allow_professional_select_patients" ON profiles;

-- Create basic policies
CREATE POLICY "basic_select_policy"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    role = 'admin' OR
    EXISTS (
      SELECT 1
      FROM appointments a
      WHERE a.provider::uuid = auth.uid()
      AND a.profile_id = profiles.id
    )
  );

CREATE POLICY "basic_insert_policy"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "basic_update_policy"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR role = 'admin')
  WITH CHECK (auth.uid() = id OR role = 'admin');

CREATE POLICY "basic_delete_policy"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (role = 'admin');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON profiles(id, role);