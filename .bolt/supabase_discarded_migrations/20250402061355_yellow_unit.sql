/*
  # Fix Care Team Members RLS Policies

  1. Changes
    - Drop existing policies that cause recursion
    - Create new simplified policies that avoid recursion
    - Optimize policy conditions for better performance

  2. Security
    - Enable RLS
    - Add policies for:
      - Members to see their own care team
      - Partners to see their assigned patients
      - Admins to manage all records
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
    profile_id = auth.uid() OR
    -- Partners can see their assigned patients
    partner_id = auth.uid() OR
    -- Admins can see all records
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "care_team_members_insert"
  ON care_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only admins can insert
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "care_team_members_update"
  ON care_team_members
  FOR UPDATE
  TO authenticated
  USING (
    -- Only admins can update
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    -- Only admins can update
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "care_team_members_delete"
  ON care_team_members
  FOR DELETE
  TO authenticated
  USING (
    -- Only admins can delete
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Drop existing indexes first to avoid conflicts
DROP INDEX IF EXISTS idx_care_team_members_profile_id;
DROP INDEX IF EXISTS idx_care_team_members_partner_id;
DROP INDEX IF EXISTS idx_care_team_members_composite;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_care_team_members_profile_id ON care_team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_partner_id ON care_team_members(partner_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_composite ON care_team_members(profile_id, partner_id);