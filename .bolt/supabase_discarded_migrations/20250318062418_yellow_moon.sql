/*
  # Fix Profile Policies Final

  1. Changes
    - Remove all recursive policy checks
    - Implement non-recursive role checks
    - Simplify policy structure
    - Use materialized role checks
    
  2. Security
    - Maintain proper access control
    - Prevent infinite recursion
    - Keep RLS enabled
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable read access" ON profiles;
DROP POLICY IF EXISTS "Enable insert" ON profiles;
DROP POLICY IF EXISTS "Enable update" ON profiles;
DROP POLICY IF EXISTS "Enable delete" ON profiles;

-- Create a function to check admin role without recursion
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE u.id = user_id
    AND p.role = 'admin'::user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check professional role without recursion
CREATE OR REPLACE FUNCTION is_professional(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE u.id = user_id
    AND p.role IN ('physician'::user_role, 'nurse'::user_role)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Basic read policy
CREATE POLICY "profiles_read_policy"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own profile
    auth.uid() = id
    OR 
    -- Admins can read all profiles
    is_admin(auth.uid())
    OR
    -- Professionals can read their patients' profiles
    (
      is_professional(auth.uid()) AND
      EXISTS (
        SELECT 1
        FROM appointments a
        WHERE a.provider::uuid = auth.uid()
        AND a.profile_id = profiles.id
      )
    )
  );

-- Insert policy - users can only create their own profile
CREATE POLICY "profiles_insert_policy"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Update policy
CREATE POLICY "profiles_update_policy"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    is_admin(auth.uid())
  )
  WITH CHECK (
    auth.uid() = id OR
    is_admin(auth.uid())
  );

-- Delete policy - only admins can delete
CREATE POLICY "profiles_delete_policy"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON profiles(id, role);