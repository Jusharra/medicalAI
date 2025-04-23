/*
  # Fix Leads Table and Add Demo Data

  1. Changes
    - Check if tables exist before creating them
    - Drop existing policies and triggers to avoid conflicts
    - Create leads, lead_interactions, and lead_assignments tables
    - Add proper indexes and constraints
    - Insert sample data

  2. Security
    - Enable RLS
    - Add policies for admins and partners
*/

-- Check if tables exist before creating them
DO $$ 
BEGIN
    -- Drop existing policies if they exist to avoid conflicts
    DROP POLICY IF EXISTS "Admins full access to leads" ON leads;
    DROP POLICY IF EXISTS "Partners can view assigned leads" ON leads;
    DROP POLICY IF EXISTS "Admins full access to lead interactions" ON lead_interactions;
    DROP POLICY IF EXISTS "Admins full access to lead assignments" ON lead_assignments;
    
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
    DROP TRIGGER IF EXISTS track_lead_status_change_trigger ON leads;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create leads table if it doesn't exist
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

-- Create lead_interactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS lead_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  interaction_type text NOT NULL,
  content jsonb,
  engagement_score integer,
  created_at timestamptz DEFAULT now()
);

-- Create lead_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  status text DEFAULT 'active',
  UNIQUE(lead_id, partner_id)
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;

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

-- Create function to track lead status changes
CREATE OR REPLACE FUNCTION track_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Insert interaction record for status change
    INSERT INTO lead_interactions (
      lead_id,
      interaction_type,
      content,
      engagement_score
    ) VALUES (
      NEW.id,
      'status_change',
      jsonb_build_object(
        'from', OLD.status,
        'to', NEW.status,
        'changed_by', auth.uid()
      ),
      CASE 
        WHEN NEW.status = 'converted' THEN 100
        WHEN NEW.status = 'qualified' THEN 75
        WHEN NEW.status = 'nurturing' THEN 50
        WHEN NEW.status = 'new' THEN 25
        ELSE 0
      END
    );
    
    -- Update last_contact timestamp
    NEW.last_contact = now();
    
    -- Set next_contact based on new status
    IF NEW.status = 'new' THEN
      NEW.next_contact = now() + interval '1 day';
    ELSIF NEW.status = 'nurturing' THEN
      NEW.next_contact = now() + interval '3 days';
    ELSIF NEW.status = 'qualified' THEN
      NEW.next_contact = now() + interval '1 day';
    ELSIF NEW.status = 'converted' THEN
      NEW.next_contact = now() + interval '7 days';
    ELSE
      NEW.next_contact = NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for lead status changes
CREATE TRIGGER track_lead_status_change_trigger
  BEFORE UPDATE OF status ON leads
  FOR EACH ROW
  EXECUTE FUNCTION track_lead_status_change();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_last_contact ON leads(last_contact DESC);
CREATE INDEX IF NOT EXISTS idx_leads_next_contact ON leads(next_contact);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_type ON lead_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_lead_id ON lead_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_partner_id ON lead_assignments(partner_id);

-- Create view for lead funnel statistics if it doesn't exist
CREATE OR REPLACE VIEW lead_funnel_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'new') AS new_leads,
  COUNT(*) FILTER (WHERE status = 'nurturing') AS nurturing_leads,
  COUNT(*) FILTER (WHERE status = 'qualified') AS qualified_leads,
  COUNT(*) FILTER (WHERE status = 'converted') AS converted_leads,
  COUNT(*) FILTER (WHERE status = 'lost') AS lost_leads,
  COUNT(*) AS total_leads,
  CASE 
    WHEN COUNT(*) > 0 THEN 
      ROUND((COUNT(*) FILTER (WHERE status = 'converted')::numeric / COUNT(*)::numeric) * 100, 2)
    ELSE 0
  END AS conversion_rate
FROM leads;

-- Insert sample data only if the table is empty
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM leads LIMIT 1) THEN
    -- Insert sample leads
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
  END IF;
END $$;

-- Create leads from existing member users if they don't already exist
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
SELECT
  p.email,
  SPLIT_PART(COALESCE(p.full_name, ''), ' ', 1) as first_name,
  NULLIF(REGEXP_REPLACE(COALESCE(p.full_name, ''), '^[^ ]+ ?', ''), '') as last_name,
  NULL as phone, -- No phone data available
  CASE 
    WHEN random() < 0.3 THEN 'new'
    WHEN random() < 0.5 THEN 'nurturing'
    WHEN random() < 0.7 THEN 'qualified'
    WHEN random() < 0.9 THEN 'converted'
    ELSE 'lost'
  END as status,
  CASE floor(random() * 5)
    WHEN 0 THEN 'website'
    WHEN 1 THEN 'referral'
    WHEN 2 THEN 'social'
    WHEN 3 THEN 'email'
    ELSE 'event'
  END as source,
  floor(random() * 100) as lead_score,
  p.created_at - (random() * interval '60 days') as created_at,
  p.created_at - (random() * interval '30 days') as last_contact,
  CASE 
    WHEN random() < 0.7 THEN p.created_at + (random() * interval '14 days')
    ELSE NULL
  END as next_contact,
  CASE floor(random() * 5)
    WHEN 0 THEN 'Interested in premium health services'
    WHEN 1 THEN 'Requested information about membership options'
    WHEN 2 THEN 'Completed initial health assessment'
    WHEN 3 THEN 'Referred by existing member'
    ELSE 'Inquired about specific health concerns'
  END as notes,
  ARRAY[
    CASE floor(random() * 4)
      WHEN 0 THEN 'preventive care'
      WHEN 1 THEN 'wellness'
      WHEN 2 THEN 'executive health'
      ELSE 'family health'
    END,
    CASE floor(random() * 4)
      WHEN 0 THEN 'nutrition'
      WHEN 1 THEN 'fitness'
      WHEN 2 THEN 'mental health'
      ELSE 'chronic care'
    END
  ] as health_interests,
  jsonb_build_object(
    'symptoms', ARRAY[
      CASE floor(random() * 4)
        WHEN 0 THEN 'stress'
        WHEN 1 THEN 'fatigue'
        WHEN 2 THEN 'sleep issues'
        ELSE 'joint pain'
      END,
      CASE floor(random() * 4)
        WHEN 0 THEN 'headaches'
        WHEN 1 THEN 'digestive issues'
        WHEN 2 THEN 'anxiety'
        ELSE 'allergies'
      END
    ],
    'lifestyle', ARRAY[
      CASE floor(random() * 4)
        WHEN 0 THEN 'sedentary work'
        WHEN 1 THEN 'high stress'
        WHEN 2 THEN 'frequent travel'
        ELSE 'irregular meals'
      END,
      CASE floor(random() * 4)
        WHEN 0 THEN 'limited exercise'
        WHEN 1 THEN 'poor sleep'
        WHEN 2 THEN 'high screen time'
        ELSE 'active lifestyle'
      END
    ]
  ) as risk_factors
FROM profiles p
JOIN users u ON p.id = u.id
WHERE u.role = 'member'
AND NOT EXISTS (
  SELECT 1 FROM leads WHERE leads.email = p.email
)
ON CONFLICT DO NOTHING;