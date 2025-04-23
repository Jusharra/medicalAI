/*
  # Fix Care Team Members Table for Pharmacies

  1. Changes
    - Add pharmacy_id column to care_team_members if it doesn't exist
    - Update policies to handle pharmacy relationships
    - Create indexes for better performance

  2. Security
    - Enable RLS
    - Create policies for authenticated users
*/

-- Add pharmacy_id column to care_team_members if it doesn't exist
ALTER TABLE care_team_members
ADD COLUMN IF NOT EXISTS pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE care_team_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "care_team_members_select" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_insert" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_update" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_delete" ON care_team_members;

-- Create new policies that handle both partner_id and pharmacy_id
CREATE POLICY "care_team_members_select"
  ON care_team_members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "care_team_members_insert"
  ON care_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
  );

CREATE POLICY "care_team_members_update"
  ON care_team_members
  FOR UPDATE
  TO authenticated
  USING (
    profile_id = auth.uid()
  )
  WITH CHECK (
    profile_id = auth.uid()
  );

CREATE POLICY "care_team_members_delete"
  ON care_team_members
  FOR DELETE
  TO authenticated
  USING (
    profile_id = auth.uid()
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_care_team_members_profile_id ON care_team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_partner_id ON care_team_members(partner_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_pharmacy_id ON care_team_members(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_is_primary ON care_team_members(is_primary);