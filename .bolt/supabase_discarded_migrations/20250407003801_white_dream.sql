/*
  # Fix Symptom Triage Demo Data

  1. Changes
    - Insert sample symptom submissions data
    - Insert sample provider notes and replies
    - Ensure data is properly assigned to partners
    - Fix foreign key constraint issues

  2. Security
    - No changes to RLS policies needed
*/

-- Insert sample symptom submissions data
INSERT INTO symptom_submissions (
  profile_id,
  symptoms,
  duration,
  severity,
  onset_date,
  status,
  urgency_flag,
  ai_assessment,
  ai_risk_level,
  ai_confidence,
  assigned_partner_id,
  created_at,
  updated_at,
  notes
)
SELECT
  profiles.id as profile_id,
  symptoms_data.symptoms,
  symptoms_data.duration,
  symptoms_data.severity,
  (now() - (random() * interval '14 days'))::date as onset_date,
  symptoms_data.status,
  symptoms_data.urgency_flag,
  symptoms_data.ai_assessment,
  symptoms_data.ai_risk_level,
  symptoms_data.ai_confidence,
  partners.id as assigned_partner_id,
  now() - (random() * interval '7 days') as created_at,
  now() - (random() * interval '3 days') as updated_at,
  symptoms_data.notes
FROM profiles
CROSS JOIN (
  VALUES
    ('Headache and fatigue for the past 3 days', '1-3 days', 6, 'Submitted', 'Medium', 'This may be consistent with tension headache or migraine. Consider rest, hydration, and over-the-counter pain relievers.', 'Moderate', 0.85, 'Patient reports similar episodes in the past'),
    ('Sore throat and mild fever', '2-4 days', 5, 'Under Review', 'Low', 'This may be consistent with viral pharyngitis. Recommend rest, fluids, and throat lozenges.', 'Mild', 0.92, 'No known allergies'),
    ('Severe chest pain radiating to left arm', 'Less than a day', 9, 'Escalated', 'High', 'This presentation is concerning for possible cardiac issues and requires immediate evaluation.', 'Needs Review', 0.78, 'Family history of heart disease'),
    ('Persistent cough with yellow sputum', '1-2 weeks', 7, 'Reviewed', 'Medium', 'This may be consistent with bronchitis or respiratory infection. Consider evaluation for antibiotic need.', 'Moderate', 0.88, 'Smoker, 10 pack-years'),
    ('Skin rash with itching on arms and torso', '3-5 days', 4, 'Scheduled', 'Low', 'This may be consistent with contact dermatitis or allergic reaction. Avoid potential triggers.', 'Mild', 0.91, 'Previous history of eczema'),
    ('Lower back pain after lifting', '2 days', 6, 'Submitted', 'Medium', 'This may be consistent with lumbar strain. Recommend rest, gentle stretching, and anti-inflammatories.', 'Moderate', 0.89, 'Previous back injury 2 years ago'),
    ('Dizziness and nausea when standing', '4 days', 5, 'Under Review', 'Medium', 'This may be consistent with orthostatic hypotension or inner ear disturbance. Monitor blood pressure.', 'Moderate', 0.82, 'Currently on blood pressure medication'),
    ('Joint pain in multiple fingers', '2 weeks', 6, 'Reviewed', 'Medium', 'This may be consistent with early arthritis or inflammatory condition. Anti-inflammatories may help.', 'Moderate', 0.84, 'Family history of rheumatoid arthritis'),
    ('Frequent urination and increased thirst', '1 week', 5, 'Scheduled', 'Medium', 'This presentation warrants evaluation for metabolic conditions including diabetes.', 'Moderate', 0.87, 'Recent weight loss noted'),
    ('Migraine with visual aura', '2 days', 8, 'Submitted', 'High', 'This is consistent with migraine with aura. Recommend dark quiet room and prescribed medications.', 'Moderate', 0.93, 'History of similar episodes')
) as symptoms_data(symptoms, duration, severity, status, urgency_flag, ai_assessment, ai_risk_level, ai_confidence, notes)
CROSS JOIN partners
WHERE profiles.id IN (
  SELECT id FROM profiles 
  ORDER BY created_at ASC 
  LIMIT 10
)
AND partners.id IN (
  SELECT id FROM partners 
  WHERE status = 'active'
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM symptom_submissions 
  WHERE symptom_submissions.symptoms = symptoms_data.symptoms
  AND symptom_submissions.profile_id = profiles.id
)
LIMIT 10;

-- Get partner IDs that are also in auth.users table to avoid foreign key constraint violations
WITH valid_providers AS (
  SELECT p.id 
  FROM partners p
  JOIN auth.users u ON p.id = u.id
  WHERE p.status = 'active'
  LIMIT 5
)

-- Insert provider notes for the submissions
INSERT INTO provider_notes (
  submission_id,
  provider_id,
  content,
  created_at
)
SELECT
  s.id as submission_id,
  vp.id as provider_id,
  notes_data.content,
  s.created_at + interval '1 day' as created_at
FROM symptom_submissions s
CROSS JOIN (
  VALUES
    ('Reviewed patient history. Previous episodes of similar symptoms noted. Will need to consider preventive options.'),
    ('Patient may benefit from further diagnostic testing. Will discuss options during consultation.'),
    ('Symptoms appear to be improving based on follow-up communication. Continue current management plan.'),
    ('Recommend follow-up appointment to assess response to treatment recommendations.'),
    ('Consider referral to specialist if symptoms persist beyond two weeks.')
) as notes_data(content)
CROSS JOIN valid_providers vp
WHERE s.status IN ('Under Review', 'Reviewed', 'Scheduled')
AND NOT EXISTS (
  SELECT 1 FROM provider_notes 
  WHERE provider_notes.submission_id = s.id
)
ORDER BY random()
LIMIT 10;

-- Get partner IDs that are also in auth.users table to avoid foreign key constraint violations
WITH valid_providers AS (
  SELECT p.id 
  FROM partners p
  JOIN auth.users u ON p.id = u.id
  WHERE p.status = 'active'
  LIMIT 5
)

-- Insert provider replies for the submissions
INSERT INTO provider_replies (
  submission_id,
  provider_id,
  content,
  created_at
)
SELECT
  s.id as submission_id,
  vp.id as provider_id,
  replies_data.content,
  s.created_at + interval '2 days' as created_at
FROM symptom_submissions s
CROSS JOIN (
  VALUES
    ('Thank you for your submission. Based on your symptoms, I recommend scheduling a virtual consultation to discuss treatment options. I have availability tomorrow morning.'),
    ('I''ve reviewed your symptoms and recommend the following: 1) Rest and hydration, 2) Over-the-counter pain relievers as directed, 3) Schedule a follow-up if symptoms persist beyond 5 days.'),
    ('Your symptoms suggest a possible viral infection. At this time, I recommend supportive care including rest, fluids, and fever reducers if needed. Please schedule an appointment if symptoms worsen or fail to improve within 48 hours.'),
    ('Based on your submission, I''d like to see you for an in-person evaluation. Please schedule an appointment at your earliest convenience. In the meantime, avoid strenuous activity and take acetaminophen for pain if needed.'),
    ('Thank you for providing this information. I''ve reviewed your symptoms and medical history. I recommend we schedule a video consultation to discuss your symptoms in more detail and develop a treatment plan.')
) as replies_data(content)
CROSS JOIN valid_providers vp
WHERE s.status IN ('Reviewed', 'Scheduled')
AND NOT EXISTS (
  SELECT 1 FROM provider_replies 
  WHERE provider_replies.submission_id = s.id
)
ORDER BY random()
LIMIT 5;

-- Get partner IDs that are also in auth.users table to avoid foreign key constraint violations
WITH valid_providers AS (
  SELECT p.id 
  FROM partners p
  JOIN auth.users u ON p.id = u.id
  WHERE p.status = 'active'
  LIMIT 5
)

-- Insert AI feedback for some submissions
INSERT INTO ai_feedback (
  submission_id,
  provider_id,
  is_helpful,
  feedback_type,
  comments,
  created_at
)
SELECT
  s.id as submission_id,
  vp.id as provider_id,
  CASE WHEN random() < 0.8 THEN true ELSE false END as is_helpful,
  CASE floor(random() * 4)
    WHEN 0 THEN 'Accuracy'
    WHEN 1 THEN 'Relevance'
    WHEN 2 THEN 'Clarity'
    ELSE 'Completeness'
  END as feedback_type,
  CASE WHEN random() < 0.7 
    THEN CASE floor(random() * 3)
      WHEN 0 THEN 'AI assessment was accurate and helpful for triage.'
      WHEN 1 THEN 'Assessment provided good initial guidance but missed some important context.'
      ELSE 'Very comprehensive assessment that helped prioritize this case appropriately.'
    END
    ELSE NULL
  END as comments,
  s.created_at + interval '3 days' as created_at
FROM symptom_submissions s
CROSS JOIN valid_providers vp
WHERE s.status IN ('Reviewed', 'Scheduled')
AND s.ai_assessment IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM ai_feedback 
  WHERE ai_feedback.submission_id = s.id
)
ORDER BY random()
LIMIT 5;

-- Get partner IDs that are also in auth.users table to avoid foreign key constraint violations
WITH valid_providers AS (
  SELECT p.id 
  FROM partners p
  JOIN auth.users u ON p.id = u.id
  WHERE p.status = 'active'
  LIMIT 5
)

-- Insert activity logs for the submissions
INSERT INTO triage_activity_logs (
  submission_id,
  action,
  user_id,
  user_name,
  details,
  timestamp
)
SELECT
  s.id as submission_id,
  action_data.action,
  vp.id as user_id,
  'Dr. Provider',
  action_data.details,
  s.created_at + (random() * interval '4 days') as timestamp
FROM symptom_submissions s
CROSS JOIN (
  VALUES
    ('Viewed', 'Provider viewed submission details'),
    ('Status Changed', 'Status updated to Under Review'),
    ('Note Added', 'Provider added clinical note'),
    ('Reply Sent', 'Provider sent response to patient'),
    ('Assigned', 'Case assigned to provider')
) as action_data(action, details)
CROSS JOIN valid_providers vp
WHERE NOT EXISTS (
  SELECT 1 FROM triage_activity_logs 
  WHERE triage_activity_logs.submission_id = s.id
  AND triage_activity_logs.action = action_data.action
)
ORDER BY random()
LIMIT 20;

-- If we need to ensure a specific partner has data, we can add a special case
-- This ensures the partner with ID 'c349a285-bc2c-494b-902b-7e35358a495d' has symptom submissions
DO $$
DECLARE
  partner_id uuid := 'c349a285-bc2c-494b-902b-7e35358a495d';
  profile_id uuid;
  submission_id uuid;
BEGIN
  -- Check if this partner exists in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = partner_id) THEN
    -- Get a profile ID to use
    SELECT id INTO profile_id FROM profiles ORDER BY created_at ASC LIMIT 1;
    
    -- Create a submission specifically for this partner
    IF NOT EXISTS (
      SELECT 1 FROM symptom_submissions 
      WHERE assigned_partner_id = partner_id
      LIMIT 1
    ) AND profile_id IS NOT NULL THEN
      INSERT INTO symptom_submissions (
        profile_id,
        symptoms,
        duration,
        severity,
        onset_date,
        status,
        urgency_flag,
        ai_assessment,
        ai_risk_level,
        ai_confidence,
        assigned_partner_id,
        created_at,
        updated_at,
        notes
      ) VALUES (
        profile_id,
        'Persistent headache with neck stiffness',
        '3 days',
        7,
        (now() - interval '3 days')::date,
        'Under Review',
        'Medium',
        'This may be consistent with tension headache or migraine. If fever or severe neck stiffness develops, urgent evaluation is recommended.',
        'Moderate',
        0.86,
        partner_id,
        now() - interval '2 days',
        now() - interval '1 day',
        'Patient reports light sensitivity and nausea accompanying headache'
      ) RETURNING id INTO submission_id;
      
      -- Add a provider note
      IF submission_id IS NOT NULL THEN
        INSERT INTO provider_notes (
          submission_id,
          provider_id,
          content,
          created_at
        ) VALUES (
          submission_id,
          partner_id,
          'Reviewed symptoms and history. Will need to rule out more serious conditions. Recommend virtual consultation.',
          now() - interval '12 hours'
        );
        
        -- Add activity log
        INSERT INTO triage_activity_logs (
          submission_id,
          action,
          user_id,
          user_name,
          details,
          timestamp
        ) VALUES (
          submission_id,
          'Viewed',
          partner_id,
          'Dr. Partner',
          'Provider reviewed submission details',
          now() - interval '1 day'
        );
      END IF;
    END IF;
  END IF;
END $$;