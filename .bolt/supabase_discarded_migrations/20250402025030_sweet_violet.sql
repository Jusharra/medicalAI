/*
  # Fix Care Team Members RLS Policies

  1. Changes
    - Drop existing policies
    - Create new simplified policies without recursion
    - Use direct role checks from auth.users metadata
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
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "care_team_members_insert"
  ON care_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "care_team_members_update"
  ON care_team_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "care_team_members_delete"
  ON care_team_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Drop existing indexes first to avoid conflicts
DROP INDEX IF EXISTS idx_care_team_members_profile_partner;
DROP INDEX IF EXISTS idx_care_team_members_profile_id;
DROP INDEX IF EXISTS idx_care_team_members_partner_id;
DROP INDEX IF EXISTS idx_care_team_members_composite;

-- Create indexes for better performance
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
END $$;