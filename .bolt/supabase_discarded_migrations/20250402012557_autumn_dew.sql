/*
  # Add Missing Columns to Services and Care Team Members Tables

  1. Changes
    - Add `active` column to services table
    - Add `is_primary` column to care_team_members table

  2. Security
    - No changes to RLS policies needed
    - Existing policies will cover new columns
*/

-- Add active column to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Add is_primary column to care_team_members table
ALTER TABLE care_team_members 
ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_care_team_members_is_primary ON care_team_members(is_primary);

-- Update AppointmentScheduling.tsx query to use active instead of available
UPDATE services SET active = true WHERE active IS NULL;