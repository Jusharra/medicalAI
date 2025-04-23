-- Drop existing tables if they exist
DROP TABLE IF EXISTS care_team_members CASCADE;
DROP TABLE IF EXISTS pharmacies CASCADE;
DROP TABLE IF EXISTS partners CASCADE;

-- Create partners table first
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  practice_name text,
  practice_address jsonb,
  specialties text[] NOT NULL DEFAULT '{}',
  profile_image text,
  consultation_fee numeric,
  video_consultation boolean DEFAULT true,
  in_person_consultation boolean DEFAULT true,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  rating numeric CHECK (rating >= 0 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create pharmacies table
CREATE TABLE IF NOT EXISTS pharmacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address jsonb NOT NULL,
  phone text NOT NULL,
  email text NOT NULL UNIQUE,
  hours jsonb,
  services text[],
  insurance_accepted text[],
  delivery_available boolean DEFAULT false,
  delivery_radius numeric,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  rating numeric CHECK (rating >= 0 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create care_team_members table
CREATE TABLE IF NOT EXISTS care_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  relationship_type text NOT NULL CHECK (relationship_type IN ('physician', 'specialist', 'pharmacy')),
  notes text,
  selected_at timestamptz DEFAULT now(),
  last_interaction timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT one_provider_type CHECK (
    (partner_id IS NOT NULL AND pharmacy_id IS NULL) OR
    (partner_id IS NULL AND pharmacy_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_team_members ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active partners"
  ON partners
  FOR SELECT
  TO public
  USING (status = 'active' AND verification_status = 'verified');

CREATE POLICY "Anyone can view active pharmacies"
  ON pharmacies
  FOR SELECT
  TO public
  USING (status = 'active');

CREATE POLICY "Users can view own care team"
  ON care_team_members
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can manage own care team"
  ON care_team_members
  FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Create indexes
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_verification ON partners(verification_status);
CREATE INDEX idx_pharmacies_status ON pharmacies(status);
CREATE INDEX idx_care_team_profile ON care_team_members(profile_id);
CREATE INDEX idx_care_team_partner ON care_team_members(partner_id);
CREATE INDEX idx_care_team_pharmacy ON care_team_members(pharmacy_id);

-- Insert sample data
INSERT INTO partners (
  first_name,
  last_name,
  email,
  phone,
  practice_name,
  practice_address,
  specialties,
  consultation_fee,
  status,
  verification_status,
  rating
) VALUES
(
  'Sarah',
  'Chen',
  'dr.chen@vitale.health',
  '+1-555-0123',
  'Chen Medical Group',
  '{"street": "123 Medical Plaza", "city": "San Francisco", "state": "CA", "zip": "94105"}',
  ARRAY['Cardiology', 'Internal Medicine'],
  250.00,
  'active',
  'verified',
  4.9
),
(
  'Michael',
  'Rodriguez',
  'dr.rodriguez@vitale.health',
  '+1-555-0124',
  'Bay Area Wellness',
  '{"street": "456 Health Drive", "city": "San Francisco", "state": "CA", "zip": "94108"}',
  ARRAY['Family Medicine', 'Preventive Care'],
  200.00,
  'active',
  'verified',
  4.8
);

INSERT INTO pharmacies (
  name,
  address,
  phone,
  email,
  hours,
  services,
  insurance_accepted,
  delivery_available,
  delivery_radius,
  status,
  rating
) VALUES
(
  'HealthCare Pharmacy',
  '{"street": "123 Main St", "city": "San Francisco", "state": "CA", "zip": "94105"}',
  '(415) 555-0123',
  'pharmacy@healthcarepharmacy.com',
  '{"monday": {"open": "09:00", "close": "18:00"}, "tuesday": {"open": "09:00", "close": "18:00"}, "wednesday": {"open": "09:00", "close": "18:00"}, "thursday": {"open": "09:00", "close": "18:00"}, "friday": {"open": "09:00", "close": "18:00"}, "saturday": {"open": "10:00", "close": "16:00"}, "sunday": {"open": "10:00", "close": "14:00"}}',
  ARRAY['Prescription Filling', 'Medication Counseling', 'Immunizations', 'Health Screenings'],
  ARRAY['Aetna', 'Blue Cross', 'Cigna', 'UnitedHealthcare'],
  true,
  10.0,
  'active',
  4.8
);