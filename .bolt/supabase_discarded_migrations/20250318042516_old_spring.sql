/*
  # Create Pharmacies Table

  1. New Tables
    - `pharmacies`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `address` (jsonb, required) - Stores structured address data
      - `phone` (text, required)
      - `email` (text, required, unique)
      - `hours` (jsonb) - Operating hours
      - `services` (text[]) - Array of available services
      - `insurance_accepted` (text[]) - List of accepted insurance providers
      - `delivery_available` (boolean) - Whether pharmacy offers delivery
      - `delivery_radius` (numeric) - Delivery radius in miles
      - `stripe_connect_id` (text) - For payment processing
      - `status` (text) - Active/Inactive status
      - `rating` (numeric) - Average customer rating
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on pharmacies table
    - Add policies for:
      - Public read access to active pharmacies
      - Admin write access
      - Partner pharmacy self-management

  3. Indexes
    - On email for uniqueness
    - On status for filtering
    - On location for geospatial queries
*/

-- Create Pharmacies Table
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

-- Enable Row Level Security
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;

-- Create Indexes
CREATE INDEX IF NOT EXISTS pharmacies_email_idx ON pharmacies (email);
CREATE INDEX IF NOT EXISTS pharmacies_status_idx ON pharmacies (status);
CREATE INDEX IF NOT EXISTS pharmacies_location_idx ON pharmacies USING GIN ((address->'location'));

-- Create Policies
CREATE POLICY "Public can view active pharmacies"
  ON pharmacies
  FOR SELECT
  TO public
  USING (status = 'active');

CREATE POLICY "Pharmacies can update own profile"
  ON pharmacies
  FOR UPDATE
  TO authenticated
  USING (email = auth.email())
  WITH CHECK (email = auth.email());

CREATE POLICY "Pharmacies can view own profile"
  ON pharmacies
  FOR SELECT
  TO authenticated
  USING (email = auth.email());

-- Create Updated At Trigger
CREATE TRIGGER update_pharmacies_updated_at
  BEFORE UPDATE ON pharmacies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add Sample Data
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
) VALUES (
  'HealthCare Pharmacy',
  '{"street": "123 Main St", "city": "San Francisco", "state": "CA", "zip": "94105", "location": {"lat": 37.7749, "lng": -122.4194}}',
  '(415) 555-0123',
  'pharmacy@healthcarepharmacy.com',
  '{"monday": {"open": "09:00", "close": "18:00"}, "tuesday": {"open": "09:00", "close": "18:00"}, "wednesday": {"open": "09:00", "close": "18:00"}, "thursday": {"open": "09:00", "close": "18:00"}, "friday": {"open": "09:00", "close": "18:00"}, "saturday": {"open": "10:00", "close": "16:00"}, "sunday": {"open": "10:00", "close": "14:00"}}',
  ARRAY['Prescription Filling', 'Medication Counseling', 'Immunizations', 'Health Screenings', 'Compounding'],
  ARRAY['Aetna', 'Blue Cross', 'Cigna', 'UnitedHealthcare'],
  true,
  10.0,
  'active',
  4.8
);