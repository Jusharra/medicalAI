/*
  # Add Pharmacy Care Team Support

  1. Changes
    - Add pharmacy_id column to care_team_members table
    - Update constraints and indexes
    - Add sample pharmacy care team relationships

  2. Security
    - No changes to RLS policies needed
*/

-- Add pharmacy_id column to care_team_members
ALTER TABLE care_team_members
ADD COLUMN IF NOT EXISTS pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE;

-- Create index for pharmacy_id
CREATE INDEX IF NOT EXISTS idx_care_team_members_pharmacy_id ON care_team_members(pharmacy_id);

-- Insert sample pharmacy care team relationships
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