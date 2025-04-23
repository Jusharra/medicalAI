/*
  # Fix Care Team Members and Partners Relationship

  1. Changes
    - Add foreign key constraint between care_team_members and partners
    - Ensure all required columns exist
    - Clean up any orphaned records
    - Add proper indexes

  2. Security
    - Maintain existing RLS policies
*/

-- First ensure the partner_id column exists
ALTER TABLE care_team_members
ADD COLUMN IF NOT EXISTS partner_id uuid;

-- Clean up any orphaned records before adding the constraint
DELETE FROM care_team_members
WHERE partner_id IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM partners WHERE partners.id = care_team_members.partner_id
);

-- Add the foreign key constraint
ALTER TABLE care_team_members
ADD CONSTRAINT care_team_members_partner_id_fkey
FOREIGN KEY (partner_id)
REFERENCES partners(id)
ON DELETE CASCADE;

-- Ensure indexes exist for better performance
CREATE INDEX IF NOT EXISTS idx_care_team_members_partner_id ON care_team_members(partner_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_profile_id ON care_team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_composite ON care_team_members(profile_id, partner_id);