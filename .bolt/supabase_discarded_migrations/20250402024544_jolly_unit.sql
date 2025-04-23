/*
  # Fix Care Team Members RLS Policies

  1. Changes
    - Drop existing policies
    - Create new simplified policies without recursion
    - Use direct role checks from auth.jwt() instead of subqueries
    - Add proper indexes for performance

  2. Security
    - Enable RLS
    - Add policies for:
      - SELECT: Allow users to see their own care team members
      - INSERT/UPDATE/DELETE: Only admins can modify care team members
*/

-- Enable RLS
ALTER TABLE care_team_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "care_team_members_select" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_insert" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_update" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_delete" ON care_team_members;

-- Create new simplified policies without recursion
CREATE POLICY "care_team_members_select"
  ON care_team_members
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid() OR 
    partner_id = auth.uid() OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "care_team_members_insert"
  ON care_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "care_team_members_update"
  ON care_team_members
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "care_team_members_delete"
  ON care_team_members
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Drop existing indexes first
DROP INDEX IF EXISTS idx_care_team_members_profile_id;
DROP INDEX IF EXISTS idx_care_team_members_partner_id;
DROP INDEX IF EXISTS idx_care_team_members_composite;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_care_team_members_profile_id ON care_team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_partner_id ON care_team_members(partner_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_composite ON care_team_members(profile_id, partner_id);