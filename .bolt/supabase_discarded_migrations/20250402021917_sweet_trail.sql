/*
  # Fix Care Team Members RLS Policies and Indexes

  1. Changes
    - Drop and recreate RLS policies to avoid recursion
    - Drop existing indexes before recreating them
    - Add proper error handling for index creation

  2. Security
    - Enable RLS
    - Add policies for:
      - SELECT: Members can view their own care team, partners can view assigned patients
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
    profile_id = auth.uid() OR 
    partner_id = auth.uid() OR
    auth.jwt()->>'role' = 'admin'
  );

CREATE POLICY "care_team_members_insert"
  ON care_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt()->>'role' = 'admin'
  );

CREATE POLICY "care_team_members_update"
  ON care_team_members
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt()->>'role' = 'admin'
  )
  WITH CHECK (
    auth.jwt()->>'role' = 'admin'
  );

CREATE POLICY "care_team_members_delete"
  ON care_team_members
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt()->>'role' = 'admin'
  );

-- Drop existing indexes first
DROP INDEX IF EXISTS idx_care_team_members_profile_partner;
DROP INDEX IF EXISTS idx_care_team_members_profile_id;
DROP INDEX IF EXISTS idx_care_team_members_partner_id;

-- Create new indexes with error handling
DO $$ 
BEGIN
    -- Create individual indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_care_team_members_profile_id') THEN
        CREATE INDEX idx_care_team_members_profile_id ON care_team_members(profile_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_care_team_members_partner_id') THEN
        CREATE INDEX idx_care_team_members_partner_id ON care_team_members(partner_id);
    END IF;

    -- Create composite index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_care_team_members_composite') THEN
        CREATE INDEX idx_care_team_members_composite ON care_team_members(profile_id, partner_id);
    END IF;
EXCEPTION
    WHEN duplicate_table THEN
        -- Index already exists, ignore
        NULL;
END $$;