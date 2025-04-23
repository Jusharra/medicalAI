/*
  # Add Membership and Partner Management Tables

  1. New Tables
    - `memberships`
      - Stores subscription information
      - Links to Stripe Connect data
      - Tracks membership status and history
    
    - `partners`
      - Stores concierge network partner information
      - Manages partner availability and services
    
    - `partner_appointments`
      - Tracks appointment requests sent to partners
      - Links appointments with partner responses

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add policies for partner access
*/

-- Create memberships table
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create partners table
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  specialty text[],
  address jsonb,
  stripe_connect_id text,
  status text DEFAULT 'pending',
  availability jsonb,
  service_area jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create partner_appointments table
CREATE TABLE IF NOT EXISTS partner_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  response_notes text,
  response_time timestamptz,
  estimated_cost numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for memberships
CREATE POLICY "Users can view own membership"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can update own membership"
  ON memberships
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id);

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
  USING (email = auth.email());

-- Create policies for partner_appointments
CREATE POLICY "Users can view own partner appointments"
  ON partner_appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = partner_appointments.appointment_id
      AND a.profile_id = auth.uid()
    )
  );

CREATE POLICY "Partners can view assigned appointments"
  ON partner_appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partners p
      WHERE p.id = partner_appointments.partner_id
      AND p.email = auth.email()
    )
  );

CREATE POLICY "Partners can update assigned appointments"
  ON partner_appointments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partners p
      WHERE p.id = partner_appointments.partner_id
      AND p.email = auth.email()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_appointments_updated_at
  BEFORE UPDATE ON partner_appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();