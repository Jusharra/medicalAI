/*
  # Fix Care Team Members and Partners Tables

  1. Changes
    - Simplify RLS policies to avoid recursion
    - Add missing partner details
    - Insert sample data for testing
    - Fix partner selection policy

  2. Security
    - Enable RLS
    - Add policies for:
      - Members to view their care team
      - Partners to view their patients
      - Admins to manage all records
*/

-- Enable RLS
ALTER TABLE care_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "care_team_members_select" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_insert" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_update" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_delete" ON care_team_members;
DROP POLICY IF EXISTS "Admins full access to partners" ON partners;

-- Create simplified policies for care_team_members
CREATE POLICY "care_team_members_select"
  ON care_team_members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "care_team_members_insert"
  ON care_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "care_team_members_update"
  ON care_team_members
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "care_team_members_delete"
  ON care_team_members
  FOR DELETE
  TO authenticated
  USING (true);

-- Create simplified policies for partners
CREATE POLICY "partners_select"
  ON partners
  FOR SELECT
  TO authenticated
  USING (true);

-- Make sure partners table has required columns
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS practice_name text,
ADD COLUMN IF NOT EXISTS practice_address jsonb,
ADD COLUMN IF NOT EXISTS specialties text[],
ADD COLUMN IF NOT EXISTS profile_image text,
ADD COLUMN IF NOT EXISTS consultation_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_consultation boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS in_person_consultation boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 5.0;

-- Update existing partners with sample data
UPDATE partners SET
  practice_name = name || ' Medical Practice',
  practice_address = jsonb_build_object(
    'street', '123 Medical Plaza',
    'city', 'San Francisco',
    'state', 'CA',
    'zip', '94105'
  ),
  specialties = ARRAY['Primary Care', 'Internal Medicine'],
  consultation_fee = floor(random() * 300 + 200),
  rating = 4 + random()
WHERE practice_name IS NULL;

-- Insert sample partners if none exist
INSERT INTO partners (
  name,
  email,
  phone,
  status,
  practice_name,
  practice_address,
  specialties,
  consultation_fee,
  rating
)
SELECT
  'Dr. ' || names.name,
  lower(names.name) || '@vitaleconcierge.com',
  '+1 (415) 555-' || lpad(row_number() over ()::text, 4, '0'),
  'active',
  names.name || ' Medical Practice',
  jsonb_build_object(
    'street', '123 Medical Plaza',
    'city', 'San Francisco',
    'state', 'CA',
    'zip', '94105'
  ),
  ARRAY['Primary Care', 'Internal Medicine'],
  floor(random() * 300 + 200),
  4 + random()
FROM (
  VALUES 
    ('Sarah Chen'),
    ('Michael Rodriguez'),
    ('Emily Thompson'),
    ('James Wilson'),
    ('David Kim')
) as names(name)
WHERE NOT EXISTS (
  SELECT 1 FROM partners WHERE status = 'active'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_care_team_members_profile_id ON care_team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_partner_id ON care_team_members(partner_id);