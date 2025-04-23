/*
  # Fix Care Team Members RLS Policies

  1. Changes
    - Remove partner_id condition to prevent recursion
    - Use JWT claims for role checks
    - Ensure proper indexing

  2. Security
    - Enable RLS
    - Add policies for:
      - SELECT: Members can view their own care team
      - INSERT/UPDATE/DELETE: Only admins can modify
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
    -- Members can only see their own care team
    profile_id = auth.uid() OR
    -- Admin access using JWT claim
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_care_team_members_profile_id ON care_team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_partner_id ON care_team_members(partner_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_composite ON care_team_members(profile_id, partner_id);