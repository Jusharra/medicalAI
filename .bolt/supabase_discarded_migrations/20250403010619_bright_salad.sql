-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  status text DEFAULT 'new',
  source text,
  lead_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_contact timestamptz,
  next_contact timestamptz,
  notes text,
  health_interests text[],
  risk_factors jsonb
);

-- Create lead_assignments table for partner assignments BEFORE referencing it in policies
CREATE TABLE IF NOT EXISTS lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  status text DEFAULT 'active',
  UNIQUE(lead_id, partner_id)
);

-- Create lead_interactions table for tracking interactions
CREATE TABLE IF NOT EXISTS lead_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  interaction_type text NOT NULL,
  content jsonb,
  engagement_score integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies for leads
CREATE POLICY "Admins full access to leads"
  ON leads
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "Partners can view assigned leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'partner' AND
    EXISTS (
      SELECT 1 FROM lead_assignments
      WHERE lead_assignments.lead_id = leads.id
      AND lead_assignments.partner_id = auth.uid()
    )
  );

-- Create policies for lead_interactions
CREATE POLICY "Admins full access to lead interactions"
  ON lead_interactions
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create policies for lead_assignments
CREATE POLICY "Admins full access to lead assignments"
  ON lead_assignments
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_last_contact ON leads(last_contact DESC);
CREATE INDEX IF NOT EXISTS idx_leads_next_contact ON leads(next_contact);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_lead_id ON lead_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_partner_id ON lead_assignments(partner_id);

-- Insert sample data for testing
INSERT INTO leads (
  email,
  first_name,
  last_name,
  phone,
  status,
  source,
  lead_score,
  created_at,
  last_contact,
  next_contact,
  notes,
  health_interests,
  risk_factors
)
VALUES
  (
    'john.doe@example.com',
    'John',
    'Doe',
    '+1 (555) 123-4567',
    'new',
    'website',
    65,
    now() - interval '2 days',
    now() - interval '2 days',
    now() + interval '3 days',
    'Interested in executive health program',
    ARRAY['preventive care', 'executive health'],
    '{"symptoms": ["stress", "fatigue"], "lifestyle": ["sedentary work"]}'::jsonb
  ),
  (
    'jane.smith@example.com',
    'Jane',
    'Smith',
    '+1 (555) 987-6543',
    'nurturing',
    'referral',
    78,
    now() - interval '5 days',
    now() - interval '1 day',
    now() + interval '2 days',
    'Referred by Dr. Thompson',
    ARRAY['wellness', 'nutrition'],
    '{"symptoms": ["joint pain"], "lifestyle": ["active", "frequent travel"]}'::jsonb
  ),
  (
    'michael.brown@example.com',
    'Michael',
    'Brown',
    '+1 (555) 456-7890',
    'qualified',
    'social',
    92,
    now() - interval '10 days',
    now() - interval '3 days',
    now() + interval '1 day',
    'Ready to sign up for premium plan',
    ARRAY['family health', 'preventive care'],
    '{"symptoms": ["sleep issues"], "lifestyle": ["high stress", "irregular meals"]}'::jsonb
  ),
  (
    'sarah.johnson@example.com',
    'Sarah',
    'Johnson',
    '+1 (555) 789-0123',
    'converted',
    'email',
    100,
    now() - interval '30 days',
    now() - interval '7 days',
    null,
    'Signed up for Elite membership',
    ARRAY['executive health', 'global coverage'],
    '{"symptoms": [], "lifestyle": ["frequent travel", "high stress"]}'::jsonb
  ),
  (
    'david.wilson@example.com',
    'David',
    'Wilson',
    '+1 (555) 234-5678',
    'lost',
    'event',
    25,
    now() - interval '45 days',
    now() - interval '30 days',
    null,
    'Price concerns, went with competitor',
    ARRAY['basic care'],
    '{"symptoms": ["allergies"], "lifestyle": ["active"]}'::jsonb
  );

-- Insert sample interactions
INSERT INTO lead_interactions (
  lead_id,
  interaction_type,
  content,
  engagement_score,
  created_at
)
SELECT
  id as lead_id,
  CASE floor(random() * 4)
    WHEN 0 THEN 'email'
    WHEN 1 THEN 'call'
    WHEN 2 THEN 'meeting'
    ELSE 'assessment'
  END as interaction_type,
  jsonb_build_object(
    'summary', CASE floor(random() * 3)
      WHEN 0 THEN 'Discussed membership options'
      WHEN 1 THEN 'Completed health assessment'
      ELSE 'Answered questions about services'
    END,
    'duration', floor(random() * 30 + 10)
  ) as content,
  floor(random() * 100) as engagement_score,
  created_at + (random() * interval '5 days') as created_at
FROM leads
WHERE random() < 0.8 -- 80% chance of having an interaction
LIMIT 10;