/*
  # Add Partner Details and Care Team Members

  1. Changes
    - Add practice details to partners table
    - Create profiles for users if they don't exist
    - Create care team relationships
    - Update RLS policies

  2. Security
    - Enable RLS
    - Add policies for:
      - Partners to see their patients
      - Members to see their care team
      - Admins to manage all relationships
*/

-- Add practice details to partners
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS practice_name text,
ADD COLUMN IF NOT EXISTS practice_address jsonb,
ADD COLUMN IF NOT EXISTS specialties text[],
ADD COLUMN IF NOT EXISTS profile_image text,
ADD COLUMN IF NOT EXISTS consultation_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_consultation boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS in_person_consultation boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 5.0;

-- Update partner details
UPDATE partners SET
  practice_name = CASE name
    WHEN 'Dr. Sarah Chen' THEN 'Bay Area Wellness Center'
    WHEN 'Dr. Michael Rodriguez' THEN 'Rodriguez Family Practice'
    WHEN 'Dr. Emily Thompson' THEN 'Thompson Medical Group'
    ELSE name || ' Medical Practice'
  END,
  practice_address = jsonb_build_object(
    'street', '123 Medical Plaza',
    'city', 'San Francisco',
    'state', 'CA',
    'zip', '94105'
  ),
  specialties = CASE 
    WHEN name LIKE '%Chen%' THEN ARRAY['Internal Medicine', 'Preventive Care', 'Wellness']
    WHEN name LIKE '%Rodriguez%' THEN ARRAY['Family Medicine', 'Sports Medicine', 'Nutrition']
    WHEN name LIKE '%Thompson%' THEN ARRAY['Internal Medicine', 'Geriatrics', 'Chronic Care']
    ELSE ARRAY['General Medicine', 'Primary Care']
  END,
  consultation_fee = floor(random() * 300 + 200),
  rating = 4 + random(),
  profile_image = CASE name
    WHEN 'Dr. Sarah Chen' THEN 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80'
    WHEN 'Dr. Michael Rodriguez' THEN 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=300&q=80'
    WHEN 'Dr. Emily Thompson' THEN 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=300&q=80'
    ELSE NULL
  END;

-- Drop existing care team members policies
DROP POLICY IF EXISTS "care_team_members_select" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_insert" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_update" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_delete" ON care_team_members;

-- Create new policies that properly handle partner access
CREATE POLICY "care_team_members_select"
  ON care_team_members
  FOR SELECT
  TO authenticated
  USING (
    -- Members can see their care team
    profile_id = auth.uid() OR
    -- Partners can see their patients
    partner_id = auth.uid() OR
    -- Admins can see all
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "care_team_members_insert"
  ON care_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "care_team_members_update"
  ON care_team_members
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "care_team_members_delete"
  ON care_team_members
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create profiles for users if they don't exist
INSERT INTO profiles (id, email, full_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.users.id
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample care team members
INSERT INTO care_team_members (profile_id, partner_id, is_primary)
SELECT 
  p.id as profile_id,
  partners.id as partner_id,
  CASE WHEN random() < 0.3 THEN true ELSE false END as is_primary
FROM profiles p
CROSS JOIN partners
WHERE p.id IN (
  SELECT id FROM profiles ORDER BY created_at ASC LIMIT 5
)
AND partners.id IN (
  SELECT id FROM partners ORDER BY random() LIMIT 3
)
ON CONFLICT DO NOTHING;