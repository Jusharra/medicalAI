/*
  # Add Demo Data for Vital Signs and Fix Pharmacies Table

  1. Changes
    - Add demo data for vital signs
    - Fix pharmacies table policies
    - Add pharmacy_id to care_team_members if needed

  2. Security
    - Drop and recreate policies for pharmacies
*/

-- Drop existing policies for pharmacies
DROP POLICY IF EXISTS "read_pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "write_pharmacies_admin_only" ON pharmacies;
DROP POLICY IF EXISTS "update_pharmacies_admin_only" ON pharmacies;
DROP POLICY IF EXISTS "delete_pharmacies_admin_only" ON pharmacies;

-- Create policies for pharmacies
CREATE POLICY "read_pharmacies"
  ON pharmacies
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "write_pharmacies_admin_only"
  ON pharmacies
  FOR INSERT
  TO public
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "update_pharmacies_admin_only"
  ON pharmacies
  FOR UPDATE
  TO public
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "delete_pharmacies_admin_only"
  ON pharmacies
  FOR DELETE
  TO public
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Add pharmacy_id to care_team_members if it doesn't exist
ALTER TABLE care_team_members
ADD COLUMN IF NOT EXISTS pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE;

-- Create index for pharmacy_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_care_team_members_pharmacy_id ON care_team_members(pharmacy_id);

-- Insert demo vital signs data for users
INSERT INTO vital_signs (profile_id, temperature, heart_rate, blood_pressure, measured_at)
WITH user_data AS (
  SELECT 
    id as profile_id,
    generate_series(1, 5) as series_num
  FROM auth.users
  WHERE id IN (
    SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 5
  )
)
SELECT
  profile_id,
  -- Normal body temperature with slight variations (36.5-37.5°C)
  36.5 + (random() * 1.0) as temperature,
  -- Normal heart rate range (60-100 bpm)
  60 + (random() * 40) as heart_rate,
  -- Normal blood pressure range (systolic/diastolic)
  format('%s/%s', 
    floor(110 + (random() * 30))::text, 
    floor(70 + (random() * 20))::text
  ) as blood_pressure,
  -- Measurements taken over the past 30 days
  now() - ((5 - series_num) * interval '7 days') as measured_at
FROM user_data
WHERE NOT EXISTS (
  SELECT 1 FROM vital_signs 
  WHERE vital_signs.profile_id = user_data.profile_id
);

-- Create indexes for vital signs
CREATE INDEX IF NOT EXISTS idx_vital_signs_profile_id ON vital_signs(profile_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_measured_at ON vital_signs(measured_at DESC);

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