/*
  # Fix Care Team Members and Pharmacies Relationship

  1. Changes
    - Add foreign key constraint between care_team_members and pharmacies
    - Update RLS policies to allow proper access
    - Add indexes for better performance

  2. Security
    - Enable RLS
    - Add policies for:
      - SELECT: Allow users to see their own care team members
      - INSERT: Allow members to add providers to their care team
      - UPDATE/DELETE: Allow members to manage their care team
*/

-- Add pharmacy_id column to care_team_members if it doesn't exist
ALTER TABLE care_team_members
ADD COLUMN IF NOT EXISTS pharmacy_id uuid;

-- Clean up any orphaned records before adding the constraint
DELETE FROM care_team_members
WHERE pharmacy_id IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM pharmacies WHERE pharmacies.id = care_team_members.pharmacy_id
);

-- Add the foreign key constraint
ALTER TABLE care_team_members
DROP CONSTRAINT IF EXISTS care_team_members_pharmacy_id_fkey;

ALTER TABLE care_team_members
ADD CONSTRAINT care_team_members_pharmacy_id_fkey
FOREIGN KEY (pharmacy_id)
REFERENCES pharmacies(id)
ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE care_team_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "care_team_members_select" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_insert" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_update" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_delete" ON care_team_members;

-- Create new simplified policies
CREATE POLICY "care_team_members_select"
  ON care_team_members
  FOR SELECT
  TO authenticated
  USING (
    -- Direct matches for profile or partner
    profile_id = auth.uid() OR 
    partner_id = auth.uid() OR
    -- Admin access using JWT claim
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "care_team_members_insert"
  ON care_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Members can add to their own care team
    profile_id = auth.uid() OR
    -- Admins can insert for anyone
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "care_team_members_update"
  ON care_team_members
  FOR UPDATE
  TO authenticated
  USING (
    -- Members can update their own care team
    profile_id = auth.uid() OR
    -- Admins can update for anyone
    (auth.jwt() ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    -- Members can update their own care team
    profile_id = auth.uid() OR
    -- Admins can update for anyone
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "care_team_members_delete"
  ON care_team_members
  FOR DELETE
  TO authenticated
  USING (
    -- Members can delete from their own care team
    profile_id = auth.uid() OR
    -- Admins can delete for anyone
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_care_team_members_profile_id ON care_team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_partner_id ON care_team_members(partner_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_pharmacy_id ON care_team_members(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_composite ON care_team_members(profile_id, partner_id);

-- Insert sample pharmacy care team relationships if none exist
INSERT INTO care_team_members (profile_id, pharmacy_id, is_primary)
SELECT 
  profiles.id as profile_id,
  pharmacies.id as pharmacy_id,
  false as is_primary
FROM profiles
CROSS JOIN pharmacies
WHERE profiles.id IN (
  SELECT id FROM profiles ORDER BY created_at ASC LIMIT 5
)
AND pharmacies.id IN (
  SELECT id FROM pharmacies ORDER BY random() LIMIT 2
)
AND NOT EXISTS (
  SELECT 1 FROM care_team_members 
  WHERE care_team_members.profile_id = profiles.id 
  AND care_team_members.pharmacy_id = pharmacies.id
)
LIMIT 10;