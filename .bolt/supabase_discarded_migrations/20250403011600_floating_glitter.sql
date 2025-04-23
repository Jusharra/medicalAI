/*
  # Populate Leads from Member Accounts

  1. Changes
    - Create leads from existing member accounts
    - Generate realistic lead interactions
    - Set appropriate lead scores and statuses
    - Create lead assignments for partners

  2. Security
    - No changes to RLS policies needed
    - Using existing user data for population
*/

-- Create leads from existing member users
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
LIMIT 50; -- Limit to 50 new leads to avoid overwhelming the system

-- Create lead interactions for the newly created leads
INSERT INTO lead_interactions (
  lead_id,
  interaction_type,
  content,
  engagement_score,
  created_at
)
SELECT
  l.id as lead_id,
  interaction_type,
  jsonb_build_object(
    'summary', summary,
    'details', details,
    'duration', floor(random() * 30 + 5)
  ) as content,
  floor(random() * 100) as engagement_score,
  l.created_at + (random() * interval '30 days') as created_at
FROM leads l
CROSS JOIN (
  VALUES 
    ('email', 'Initial outreach email', 'Sent welcome email with membership information'),
    ('call', 'Follow-up call', 'Discussed health goals and membership options'),
    ('meeting', 'Virtual consultation', 'Completed initial health assessment'),
    ('assessment', 'Health assessment', 'Reviewed health history and current concerns'),
    ('email', 'Membership options', 'Sent detailed information about membership tiers'),
    ('call', 'Pricing discussion', 'Answered questions about pricing and benefits')
) as interactions(interaction_type, summary, details)
WHERE l.id NOT IN (
  SELECT DISTINCT lead_id FROM lead_interactions
)
AND random() < 0.7 -- 70% chance of creating an interaction
ORDER BY random()
LIMIT 100; -- Limit to 100 new interactions

-- Assign leads to partners
INSERT INTO lead_assignments (
  lead_id,
  partner_id,
  status,
  assigned_at
)
SELECT
  l.id as lead_id,
  p.id as partner_id,
  'active' as status,
  now() - (random() * interval '30 days') as assigned_at
FROM leads l
CROSS JOIN (
  SELECT id FROM users WHERE role = 'partner' LIMIT 5
) p
WHERE l.status IN ('nurturing', 'qualified')
AND NOT EXISTS (
  SELECT 1 FROM lead_assignments 
  WHERE lead_assignments.lead_id = l.id
)
AND random() < 0.5 -- 50% chance of assigning a lead
LIMIT 20; -- Limit to 20 new assignments

-- Create interaction records for assignments
INSERT INTO lead_interactions (
  lead_id,
  interaction_type,
  content,
  engagement_score,
  created_at
)
SELECT
  la.lead_id,
  'assignment' as interaction_type,
  jsonb_build_object(
    'summary', 'Lead assigned to partner',
    'partner_id', la.partner_id,
    'action', 'assigned'
  ) as content,
  50 as engagement_score,
  la.assigned_at as created_at
FROM lead_assignments la
WHERE NOT EXISTS (
  SELECT 1 FROM lead_interactions 
  WHERE lead_interactions.lead_id = la.lead_id
  AND lead_interactions.interaction_type = 'assignment'
);

-- Update lead scores based on interactions
UPDATE leads
SET lead_score = CASE
  WHEN status = 'new' THEN floor(random() * 30 + 10)
  WHEN status = 'nurturing' THEN floor(random() * 20 + 40)
  WHEN status = 'qualified' THEN floor(random() * 15 + 70)
  WHEN status = 'converted' THEN floor(random() * 10 + 90)
  ELSE floor(random() * 25)
END
WHERE lead_score = 0;

-- Create function to track lead status changes if it doesn't exist
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

-- Create trigger for lead status changes if it doesn't exist
DROP TRIGGER IF EXISTS track_lead_status_change_trigger ON leads;
CREATE TRIGGER track_lead_status_change_trigger
  BEFORE UPDATE OF status ON leads
  FOR EACH ROW
  EXECUTE FUNCTION track_lead_status_change();