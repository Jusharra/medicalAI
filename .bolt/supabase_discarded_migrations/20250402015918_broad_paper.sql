/*
  # Fix Care Team Members Policies

  1. Changes
    - Drop existing policies that cause recursion
    - Create new simplified policies without circular references
    - Add indexes for better performance

  2. Security
    - Enable RLS
    - Add policies for:
      - Members to view their own care team
      - Partners to view their assigned patients
      - Admins to manage all records
*/

-- Enable RLS
ALTER TABLE care_team_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "care_team_members_read_own" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_insert_admin" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_update_admin" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_delete_admin" ON care_team_members;

-- Create new simplified policies
CREATE POLICY "care_team_members_select"
  ON care_team_members
  FOR SELECT
  TO authenticated
  USING (
    -- Direct matches for profile or partner
    profile_id = auth.uid() OR 
    partner_id = auth.uid() OR
    -- Admin access based on metadata
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "care_team_members_insert"
  ON care_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "care_team_members_update"
  ON care_team_members
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "care_team_members_delete"
  ON care_team_members
  FOR DELETE
  TO authenticated
  USING (
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_care_team_members_profile_partner ON care_team_members(profile_id, partner_id);