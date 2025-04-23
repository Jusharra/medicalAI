/*
  # Add Prescription Management Tables

  1. New Tables
    - `medications` - Stores medication information
    - `refill_requests` - Stores prescription refill requests

  2. Security
    - Enable RLS
    - Add policies for:
      - Partners to manage refill requests
      - Members to view their own refill requests
      - Admins to manage all refill requests
*/

-- Create medications table
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  dosage text NOT NULL,
  instructions text NOT NULL,
  refills_remaining integer DEFAULT 0,
  last_filled timestamp with time zone,
  is_controlled boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Create refill_requests table
CREATE TABLE IF NOT EXISTS refill_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id uuid REFERENCES medications(id) ON DELETE CASCADE,
  request_date timestamp with time zone DEFAULT now(),
  status text DEFAULT 'pending',
  delivery_type text DEFAULT 'mail',
  notes text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE refill_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for medications
CREATE POLICY "Partners can view medications"
  ON medications
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'partner' OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "Admins can manage medications"
  ON medications
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create policies for refill_requests
CREATE POLICY "Partners can view and manage refill requests"
  ON refill_requests
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'partner' OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "Members can view their own refill requests"
  ON refill_requests
  FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid()
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name);
CREATE INDEX IF NOT EXISTS idx_medications_is_controlled ON medications(is_controlled);

CREATE INDEX IF NOT EXISTS idx_refill_requests_patient_id ON refill_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_refill_requests_medication_id ON refill_requests(medication_id);
CREATE INDEX IF NOT EXISTS idx_refill_requests_status ON refill_requests(status);
CREATE INDEX IF NOT EXISTS idx_refill_requests_request_date ON refill_requests(request_date);

-- Insert sample medications
INSERT INTO medications (name, dosage, instructions, refills_remaining, is_controlled)
VALUES
  ('Lisinopril', '10mg', 'Take 1 tablet by mouth once daily', 3, false),
  ('Metformin', '500mg', 'Take 1 tablet by mouth twice daily with meals', 2, false),
  ('Atorvastatin', '20mg', 'Take 1 tablet by mouth at bedtime', 5, false),
  ('Alprazolam', '0.5mg', 'Take 1 tablet by mouth three times daily as needed for anxiety', 1, true),
  ('Levothyroxine', '75mcg', 'Take 1 tablet by mouth once daily on an empty stomach', 6, false)
ON CONFLICT DO NOTHING;

-- Insert sample refill requests
WITH sample_users AS (
  SELECT id FROM auth.users LIMIT 5
),
sample_medications AS (
  SELECT id FROM medications LIMIT 5
)
INSERT INTO refill_requests (
  patient_id,
  medication_id,
  request_date,
  status,
  delivery_type,
  notes
)
SELECT
  u.id,
  m.id,
  now() - (random() * interval '7 days'),
  (ARRAY['pending', 'pending', 'pending', 'approved', 'denied'])[floor(random() * 5 + 1)],
  (ARRAY['drone', 'courier', 'mail'])[floor(random() * 3 + 1)],
  CASE WHEN random() > 0.5 THEN 'Please refill as soon as possible' ELSE NULL END
FROM
  sample_users u
CROSS JOIN
  sample_medications m
LIMIT 10
ON CONFLICT DO NOTHING;