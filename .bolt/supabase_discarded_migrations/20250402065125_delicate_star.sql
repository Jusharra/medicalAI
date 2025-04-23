-- Enable RLS
ALTER TABLE care_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "care_team_members_select" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_insert" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_update" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_delete" ON care_team_members;
DROP POLICY IF EXISTS "partners_select" ON partners;

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

-- Create simplified policy for partners
CREATE POLICY "partners_select"
  ON partners
  FOR SELECT
  TO authenticated
  USING (true);

-- Drop existing foreign key if it exists
ALTER TABLE care_team_members
DROP CONSTRAINT IF EXISTS care_team_members_partner_id_fkey;

-- Clean up any orphaned records
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

-- Drop existing indexes first to avoid conflicts
DROP INDEX IF EXISTS idx_care_team_members_profile_id;
DROP INDEX IF EXISTS idx_care_team_members_partner_id;
DROP INDEX IF EXISTS idx_care_team_members_composite;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_care_team_members_profile_id ON care_team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_partner_id ON care_team_members(partner_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_composite ON care_team_members(profile_id, partner_id);

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
  rating,
  profile_image
)
SELECT
  name,
  lower(replace(name, ' ', '.')) || '@vitaleconcierge.com',
  '+1 (415) 555-' || lpad(row_number() over ()::text, 4, '0'),
  'active',
  practice_name,
  practice_address,
  specialties,
  consultation_fee,
  rating,
  profile_image
FROM (
  VALUES 
    (
      'Dr. Sarah Chen',
      'Bay Area Wellness Center',
      jsonb_build_object('city', 'San Francisco', 'state', 'CA'),
      ARRAY['Internal Medicine', 'Preventive Care', 'Wellness'],
      299,
      4.9,
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80'
    ),
    (
      'Dr. Michael Rodriguez',
      'Rodriguez Family Practice',
      jsonb_build_object('city', 'Palo Alto', 'state', 'CA'),
      ARRAY['Family Medicine', 'Sports Medicine', 'Nutrition'],
      349,
      4.8,
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=300&q=80'
    ),
    (
      'Dr. Emily Thompson',
      'Thompson Medical Group',
      jsonb_build_object('city', 'San Jose', 'state', 'CA'),
      ARRAY['Internal Medicine', 'Geriatrics', 'Chronic Care'],
      399,
      5.0,
      'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=300&q=80'
    )
) as data(name, practice_name, practice_address, specialties, consultation_fee, rating, profile_image)
WHERE NOT EXISTS (
  SELECT 1 FROM partners WHERE status = 'active'
);