/*
  # Fix Care Team Members Policies

  1. Changes
    - Drop existing policies that may cause recursion
    - Create new simplified policies that avoid recursion
    - Use direct role checks without nested queries
    - Add proper indexes for performance

  2. Security
    - Enable RLS
    - Add policies for:
      - SELECT: Allow users to see their own care team members
      - INSERT: Allow members to add providers to their care team
      - UPDATE/DELETE: Allow members to manage their care team
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
    -- Members can see their own care team
    profile_id = auth.uid()
  );

CREATE POLICY "care_team_members_insert"
  ON care_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Members can add providers to their own care team
    profile_id = auth.uid()
  );

CREATE POLICY "care_team_members_update"
  ON care_team_members
  FOR UPDATE
  TO authenticated
  USING (
    -- Members can update their own care team
    profile_id = auth.uid()
  )
  WITH CHECK (
    -- Members can update their own care team
    profile_id = auth.uid()
  );

CREATE POLICY "care_team_members_delete"
  ON care_team_members
  FOR DELETE
  TO authenticated
  USING (
    -- Members can remove providers from their own care team
    profile_id = auth.uid()
  );

-- Drop existing indexes first to avoid conflicts
DROP INDEX IF EXISTS idx_care_team_members_profile_id;
DROP INDEX IF EXISTS idx_care_team_members_partner_id;
DROP INDEX IF EXISTS idx_care_team_members_composite;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_care_team_members_profile_id ON care_team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_partner_id ON care_team_members(partner_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_composite ON care_team_members(profile_id, partner_id);