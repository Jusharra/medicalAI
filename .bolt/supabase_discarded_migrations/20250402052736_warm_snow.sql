/*
  # Create Services Table

  1. New Tables
    - `services`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `category` (text)
      - `description` (text)
      - `price` (numeric)
      - `duration` (text)
      - `image_url` (text)
      - `active` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for:
      - SELECT: Allow all authenticated users to read services
      - INSERT/UPDATE/DELETE: Only admins can modify services
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS services CASCADE;

-- Create services table
CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  description text,
  price numeric,
  duration text,
  image_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "services_select"
  ON services
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "services_insert"
  ON services
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "services_update"
  ON services
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "services_delete"
  ON services
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);

-- Insert some initial services
INSERT INTO services (name, category, description, price, duration, active) VALUES
('General Health Consultation', 'medical', 'Comprehensive health assessment and consultation', 199, '60 minutes', true),
('Aesthetic Consultation', 'aesthetic', 'Personalized aesthetic treatment planning', 299, '45 minutes', true),
('Wellness Assessment', 'wellness', 'Complete wellness evaluation and recommendations', 249, '90 minutes', true),
('Medical Cosmetic Consultation', 'medical_cosmetic', 'Expert medical cosmetic treatment consultation', 349, '60 minutes', true),
('Spa Treatment', 'spa', 'Luxury spa treatment and relaxation session', 199, '120 minutes', true);