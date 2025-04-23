-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone can view active pharmacies" ON pharmacies;
    DROP POLICY IF EXISTS "Users can view own care team" ON care_team_members;
    DROP POLICY IF EXISTS "Users can manage own care team" ON care_team_members;
    DROP POLICY IF EXISTS "pharmacies_view_active" ON pharmacies;
    DROP POLICY IF EXISTS "care_team_view_own" ON care_team_members;
    DROP POLICY IF EXISTS "care_team_manage_own" ON care_team_members;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS care_team_members CASCADE;
DROP TABLE IF EXISTS pharmacies CASCADE;

-- Create pharmacies table first
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
  stripe_connect_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  rating numeric CHECK (rating >= 0 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on pharmacies
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;

-- Create policies for pharmacies
CREATE POLICY "pharmacies_view_active"
  ON pharmacies
  FOR SELECT
  TO public
  USING (status = 'active');

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

-- Enable RLS on care_team_members
ALTER TABLE care_team_members ENABLE ROW LEVEL SECURITY;

-- Create policies for care_team_members
CREATE POLICY "care_team_view_own"
  ON care_team_members
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "care_team_manage_own"
  ON care_team_members
  FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Create new indexes with unique names
CREATE INDEX care_team_profile_idx ON care_team_members(profile_id);
CREATE INDEX care_team_partner_idx ON care_team_members(partner_id);
CREATE INDEX care_team_pharmacy_idx ON care_team_members(pharmacy_id);
CREATE INDEX care_team_relationship_idx ON care_team_members(relationship_type);

-- Insert sample pharmacy data with a unique email
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
  'pharmacy3@healthcarepharmacy.com',
  '{"monday": {"open": "09:00", "close": "18:00"}, "tuesday": {"open": "09:00", "close": "18:00"}, "wednesday": {"open": "09:00", "close": "18:00"}, "thursday": {"open": "09:00", "close": "18:00"}, "friday": {"open": "09:00", "close": "18:00"}, "saturday": {"open": "10:00", "close": "16:00"}, "sunday": {"open": "10:00", "close": "14:00"}}',
  ARRAY['Prescription Filling', 'Medication Counseling', 'Immunizations', 'Health Screenings', 'Compounding'],
  ARRAY['Aetna', 'Blue Cross', 'Cigna', 'UnitedHealthcare'],
  true,
  10.0,
  'active',
  4.8
);

-- Create trigger for updated_at
CREATE TRIGGER update_care_team_members_updated_at
  BEFORE UPDATE ON care_team_members
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();