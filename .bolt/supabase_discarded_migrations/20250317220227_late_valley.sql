/*
  # Add appointment booking tables and policies

  1. New Tables
    - `appointment_types`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `base_price` (numeric)
      - `duration` (interval)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `appointment_bookings`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `partner_id` (uuid, references partners)
      - `appointment_type_id` (uuid, references appointment_types)
      - `scheduled_for` (timestamptz)
      - `status` (text)
      - `final_price` (numeric)
      - `member_discount` (numeric)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create appointment_types table
CREATE TABLE IF NOT EXISTS appointment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  base_price numeric NOT NULL,
  duration interval NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointment_bookings table
CREATE TABLE IF NOT EXISTS appointment_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES partners(id),
  appointment_type_id uuid REFERENCES appointment_types(id),
  scheduled_for timestamptz NOT NULL,
  status text DEFAULT 'pending',
  final_price numeric NOT NULL,
  member_discount numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_bookings ENABLE ROW LEVEL SECURITY;

-- Policies for appointment_types
CREATE POLICY "Anyone can view appointment types"
  ON appointment_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for appointment_bookings
CREATE POLICY "Users can view own bookings"
  ON appointment_bookings
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can create own bookings"
  ON appointment_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own bookings"
  ON appointment_bookings
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid());

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_appointment_types_updated_at
  BEFORE UPDATE ON appointment_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointment_bookings_updated_at
  BEFORE UPDATE ON appointment_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some initial appointment types
INSERT INTO appointment_types (name, description, base_price, duration) VALUES
  ('General Consultation', 'Initial consultation with a healthcare provider', 150, '30 minutes'::interval),
  ('Specialist Consultation', 'Consultation with a specialist physician', 250, '45 minutes'::interval),
  ('Follow-up Visit', 'Follow-up appointment with your healthcare provider', 100, '20 minutes'::interval),
  ('Mental Health Session', 'Counseling session with a mental health professional', 200, '50 minutes'::interval),
  ('Physical Therapy', 'Physical therapy session', 120, '45 minutes'::interval);