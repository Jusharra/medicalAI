/*
  # Fix Care Team Members RLS Policies

  1. Changes
    - Drop existing policies that may cause recursion
    - Create new simplified policies that avoid recursion
    - Optimize policy conditions for better performance
    - Add proper indexes for query optimization

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
    -- Users can only see their own care team members
    profile_id = auth.uid() OR
    -- Admins can see all records
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "care_team_members_insert"
  ON care_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only admins can insert
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "care_team_members_update"
  ON care_team_members
  FOR UPDATE
  TO authenticated
  USING (
    -- Only admins can update
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    -- Only admins can update
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "care_team_members_delete"
  ON care_team_members
  FOR DELETE
  TO authenticated
  USING (
    -- Only admins can delete
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Drop existing indexes first to avoid conflicts
DROP INDEX IF EXISTS idx_care_team_members_profile_id;
DROP INDEX IF EXISTS idx_care_team_members_partner_id;
DROP INDEX IF EXISTS idx_care_team_members_composite;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_care_team_members_profile_id ON care_team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_partner_id ON care_team_members(partner_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_composite ON care_team_members(profile_id, partner_id);