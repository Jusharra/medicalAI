/*
  # Add Appointments Table and Sample Data

  1. New Tables
    - `appointments`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references auth.users)
      - `service_id` (uuid, references services)
      - `scheduled_for` (timestamp)
      - `status` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for:
      - Users to manage their own appointments
      - Partners to manage appointments for their patients
      - Admins to manage all appointments
*/

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'))
);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "appointments_select_own"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM care_team_members
      WHERE care_team_members.partner_id = auth.uid()
      AND care_team_members.profile_id = appointments.profile_id
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "appointments_insert_own"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM care_team_members
      WHERE care_team_members.partner_id = auth.uid()
      AND care_team_members.profile_id = appointments.profile_id
    )
  );

CREATE POLICY "appointments_update_own"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM care_team_members
      WHERE care_team_members.partner_id = auth.uid()
      AND care_team_members.profile_id = appointments.profile_id
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM care_team_members
      WHERE care_team_members.partner_id = auth.uid()
      AND care_team_members.profile_id = appointments.profile_id
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX idx_appointments_profile_id ON appointments(profile_id);
CREATE INDEX idx_appointments_service_id ON appointments(service_id);
CREATE INDEX idx_appointments_scheduled_for ON appointments(scheduled_for);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Insert sample appointments
INSERT INTO appointments (profile_id, service_id, scheduled_for, status, notes) 
SELECT 
  (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1), -- Get first user
  id,
  -- Generate appointments over next 30 days
  now() + (random() * interval '30 days') + (random() * interval '12 hours'),
  (ARRAY['pending', 'confirmed', 'completed'])[floor(random() * 3 + 1)],
  CASE 
    WHEN random() > 0.5 THEN 'Special requests: ' || 
      CASE floor(random() * 3 + 1)
        WHEN 1 THEN 'Prefer female practitioner'
        WHEN 2 THEN 'Allergic to latex'
        WHEN 3 THEN 'Need parking assistance'
      END
    ELSE NULL
  END
FROM services 
WHERE random() < 0.3 -- Only create appointments for ~30% of services
ORDER BY random()
LIMIT 10; -- Create 10 sample appointments

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();