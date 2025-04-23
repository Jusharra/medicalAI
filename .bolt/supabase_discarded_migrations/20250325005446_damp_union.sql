/*
  # Create Partners Table
  
  1. New Tables
    - partners: Stores medical professional information
    - partner_specialties: Tracks partner specializations
    - partner_availability: Manages scheduling availability
    
  2. Security
    - Enable RLS
    - Add policies for partner access
*/

-- Create partners table
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  license_number text,
  license_state text,
  license_expiry date,
  npi_number text,
  practice_name text,
  practice_address jsonb,
  bio text,
  education jsonb,
  certifications text[],
  profile_image text,
  consultation_fee numeric,
  video_consultation boolean DEFAULT true,
  in_person_consultation boolean DEFAULT true,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
  rating numeric CHECK (rating >= 0 AND rating <= 5),
  total_reviews integer DEFAULT 0,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verification_date timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create partner_specialties table
CREATE TABLE IF NOT EXISTS partner_specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  specialty text NOT NULL,
  sub_specialty text,
  years_experience integer,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(partner_id, specialty, sub_specialty)
);

-- Create partner_availability table
CREATE TABLE IF NOT EXISTS partner_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  day_of_week integer CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  max_appointments integer,
  location_type text[] CHECK (location_type && ARRAY['video'::text, 'in_person'::text]),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(partner_id, day_of_week, start_time, end_time)
);

-- Create partner_leads table
CREATE TABLE IF NOT EXISTS partner_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'consultation_scheduled', 'converted', 'lost')),
  source text,
  notes text,
  first_contact_date timestamptz,
  last_contact_date timestamptz,
  next_follow_up timestamptz,
  conversion_date timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_leads ENABLE ROW LEVEL SECURITY;

-- Create policies for partners
CREATE POLICY "Partners can view own profile"
  ON partners
  FOR SELECT
  TO authenticated
  USING (email = auth.email());

CREATE POLICY "Partners can update own profile"
  ON partners
  FOR UPDATE
  TO authenticated
  USING (email = auth.email())
  WITH CHECK (email = auth.email());

CREATE POLICY "Anyone can view active partners"
  ON partners
  FOR SELECT
  TO public
  USING (status = 'active' AND verification_status = 'verified');

-- Create policies for partner_specialties
CREATE POLICY "Partners can manage own specialties"
  ON partner_specialties
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partners
      WHERE id = partner_specialties.partner_id
      AND email = auth.email()
    )
  );

CREATE POLICY "Anyone can view partner specialties"
  ON partner_specialties
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM partners
      WHERE id = partner_specialties.partner_id
      AND status = 'active'
      AND verification_status = 'verified'
    )
  );

-- Create policies for partner_availability
CREATE POLICY "Partners can manage own availability"
  ON partner_availability
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partners
      WHERE id = partner_availability.partner_id
      AND email = auth.email()
    )
  );

CREATE POLICY "Anyone can view partner availability"
  ON partner_availability
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM partners
      WHERE id = partner_availability.partner_id
      AND status = 'active'
      AND verification_status = 'verified'
    )
  );

-- Create policies for partner_leads
CREATE POLICY "Partners can view own leads"
  ON partner_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partners
      WHERE id = partner_leads.partner_id
      AND email = auth.email()
    )
  );

CREATE POLICY "Partners can update own leads"
  ON partner_leads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partners
      WHERE id = partner_leads.partner_id
      AND email = auth.email()
    )
  );

-- Create indexes
CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_verification_status ON partners(verification_status);
CREATE INDEX idx_partner_specialties_partner ON partner_specialties(partner_id);
CREATE INDEX idx_partner_specialties_specialty ON partner_specialties(specialty);
CREATE INDEX idx_partner_availability_partner ON partner_availability(partner_id);
CREATE INDEX idx_partner_availability_day ON partner_availability(day_of_week);
CREATE INDEX idx_partner_leads_partner ON partner_leads(partner_id);
CREATE INDEX idx_partner_leads_profile ON partner_leads(profile_id);
CREATE INDEX idx_partner_leads_status ON partner_leads(status);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_partner_availability_updated_at
  BEFORE UPDATE ON partner_availability
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_partner_leads_updated_at
  BEFORE UPDATE ON partner_leads
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Insert sample partner data
INSERT INTO partners (
  first_name,
  last_name,
  email,
  phone,
  license_number,
  license_state,
  practice_name,
  practice_address,
  bio,
  education,
  certifications,
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
  'MD123456',
  'CA',
  'Chen Medical Group',
  '{"street": "123 Medical Plaza", "city": "San Francisco", "state": "CA", "zip": "94105"}',
  'Board-certified dermatologist specializing in aesthetic and medical dermatology with over 15 years of experience.',
  '[{"degree": "MD", "institution": "Stanford Medical School", "year": 2008}, {"degree": "Residency", "institution": "UCSF", "year": 2012}]',
  ARRAY['Board Certified - Dermatology', 'Advanced Botox Certification', 'Laser Surgery Specialist'],
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
  'MD123457',
  'CA',
  'Bay Area Wellness Center',
  '{"street": "456 Health Drive", "city": "San Francisco", "state": "CA", "zip": "94108"}',
  'Integrative medicine specialist focusing on holistic wellness and preventive care.',
  '[{"degree": "MD", "institution": "UCSF Medical School", "year": 2010}, {"degree": "Fellowship", "institution": "Mayo Clinic", "year": 2014}]',
  ARRAY['Board Certified - Internal Medicine', 'Integrative Medicine Certification', 'Functional Medicine Practitioner'],
  200.00,
  'active',
  'verified',
  4.8
);