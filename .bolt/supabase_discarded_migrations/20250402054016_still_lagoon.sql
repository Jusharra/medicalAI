-- Drop existing policies first
DROP POLICY IF EXISTS "Admins full access to partners" ON partners;

-- Create partners table if it doesn't exist
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins full access to partners"
  ON partners
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_email ON partners(email);

-- Insert demo healthcare providers
INSERT INTO partners (name, email, phone, status) VALUES
-- Primary Care Physicians
('Dr. Sarah Chen', 'dr.chen@vitaleconcierge.com', '+1 (415) 555-0101', 'active'),
('Dr. Michael Rodriguez', 'dr.rodriguez@vitaleconcierge.com', '+1 (415) 555-0102', 'active'),
('Dr. Emily Thompson', 'dr.thompson@vitaleconcierge.com', '+1 (415) 555-0103', 'active'),
('Dr. James Wilson', 'dr.wilson@vitaleconcierge.com', '+1 (415) 555-0104', 'active'),

-- Specialists
('Dr. David Kim', 'dr.kim@vitaleconcierge.com', '+1 (415) 555-0105', 'active'),
('Dr. Lisa Patel', 'dr.patel@vitaleconcierge.com', '+1 (415) 555-0106', 'active'),
('Dr. Robert Johnson', 'dr.johnson@vitaleconcierge.com', '+1 (415) 555-0107', 'active'),
('Dr. Maria Garcia', 'dr.garcia@vitaleconcierge.com', '+1 (415) 555-0108', 'active'),

-- Wellness Practitioners
('Dr. Jennifer Lee', 'dr.lee@vitaleconcierge.com', '+1 (415) 555-0109', 'active'),
('Dr. William Brown', 'dr.brown@vitaleconcierge.com', '+1 (415) 555-0110', 'active'),
('Dr. Amanda White', 'dr.white@vitaleconcierge.com', '+1 (415) 555-0111', 'active'),
('Dr. Thomas Anderson', 'dr.anderson@vitaleconcierge.com', '+1 (415) 555-0112', 'active'),

-- Aesthetic Specialists
('Dr. Rachel Green', 'dr.green@vitaleconcierge.com', '+1 (415) 555-0113', 'active'),
('Dr. Daniel Martinez', 'dr.martinez@vitaleconcierge.com', '+1 (415) 555-0114', 'active'),
('Dr. Sophie Taylor', 'dr.taylor@vitaleconcierge.com', '+1 (415) 555-0115', 'active'),
('Dr. Christopher Lee', 'dr.chris.lee@vitaleconcierge.com', '+1 (415) 555-0116', 'active'),

-- Medical Cosmetic Specialists
('Dr. Victoria Adams', 'dr.adams@vitaleconcierge.com', '+1 (415) 555-0117', 'active'),
('Dr. Alexander Wright', 'dr.wright@vitaleconcierge.com', '+1 (415) 555-0118', 'active'),
('Dr. Olivia Parker', 'dr.parker@vitaleconcierge.com', '+1 (415) 555-0119', 'active'),
('Dr. Benjamin Foster', 'dr.foster@vitaleconcierge.com', '+1 (415) 555-0120', 'active');