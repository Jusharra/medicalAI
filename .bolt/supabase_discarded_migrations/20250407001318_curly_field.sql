/*
  # Add Demo Data for Symptom Submissions

  1. Changes
    - Add indexes for better query performance
    - Insert sample data for testing
    - Add sample provider notes and replies

  2. Security
    - No changes to RLS policies needed
*/

-- Create indexes for better query performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_symptom_submissions_profile_id ON symptom_submissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_symptom_submissions_assigned_partner_id ON symptom_submissions(assigned_partner_id);
CREATE INDEX IF NOT EXISTS idx_symptom_submissions_status ON symptom_submissions(status);
CREATE INDEX IF NOT EXISTS idx_symptom_submissions_urgency_flag ON symptom_submissions(urgency_flag);
CREATE INDEX IF NOT EXISTS idx_symptom_submissions_created_at ON symptom_submissions(created_at DESC);

-- Insert sample data for testing if the table is empty
DO $$
DECLARE
  partner_id uuid;
  submission_id uuid;
  user_id uuid;
BEGIN
  -- Get a partner ID to assign submissions to
  SELECT id INTO partner_id FROM partners WHERE status = 'active' LIMIT 1;
  
  -- If no partner found, use a default value
  IF partner_id IS NULL THEN
    partner_id := 'c349a285-bc2c-494b-902b-7e35358a495d';
  END IF;

  -- Get a user ID to use for provider notes and replies
  SELECT id INTO user_id FROM auth.users WHERE (auth.users.raw_user_meta_data->>'role')::text = 'partner' LIMIT 1;
  
  -- If no partner user found, use the partner_id
  IF user_id IS NULL THEN
    user_id := partner_id;
  END IF;

  -- Insert sample data if table is empty
  IF NOT EXISTS (SELECT 1 FROM symptom_submissions LIMIT 1) THEN
    INSERT INTO symptom_submissions (
      profile_id,
      symptoms,
      duration,
      severity,
      status,
      urgency_flag,
      ai_assessment,
      ai_risk_level,
      ai_confidence,
      assigned_partner_id,
      created_at,
      notes
    )
    SELECT
      id as profile_id,
      CASE floor(random() * 5)
        WHEN 0 THEN 'Headache and fatigue for the past 3 days'
        WHEN 1 THEN 'Sore throat and mild fever'
        WHEN 2 THEN 'Lower back pain after lifting heavy objects'
        WHEN 3 THEN 'Rash on forearm, slightly itchy'
        ELSE 'Persistent dry cough, worse at night'
      END as symptoms,
      CASE floor(random() * 4)
        WHEN 0 THEN '1-3 days'
        WHEN 1 THEN '4-7 days'
        WHEN 2 THEN '1-2 weeks'
        ELSE 'Less than a day'
      END as duration,
      floor(random() * 10) + 1 as severity,
      CASE floor(random() * 5)
        WHEN 0 THEN 'Submitted'
        WHEN 1 THEN 'Under Review'
        WHEN 2 THEN 'Reviewed'
        WHEN 3 THEN 'Escalated'
        ELSE 'Scheduled'
      END as status,
      CASE 
        WHEN random() < 0.2 THEN 'High'
        WHEN random() < 0.6 THEN 'Medium'
        ELSE 'Low'
      END as urgency_flag,
      CASE floor(random() * 4)
        WHEN 0 THEN 'This may be consistent with tension headache or migraine'
        WHEN 1 THEN 'This may be consistent with viral pharyngitis'
        WHEN 2 THEN 'This may be consistent with lumbar strain'
        ELSE 'This may be consistent with upper respiratory infection'
      END as ai_assessment,
      CASE 
        WHEN random() < 0.2 THEN 'Needs Review'
        WHEN random() < 0.6 THEN 'Moderate'
        ELSE 'Mild'
      END as ai_risk_level,
      0.7 + (random() * 0.25) as ai_confidence,
      partner_id as assigned_partner_id,
      now() - (random() * interval '30 days') as created_at,
      CASE floor(random() * 3)
        WHEN 0 THEN 'Patient has history of similar symptoms'
        WHEN 1 THEN 'Follow up needed within 48 hours'
        ELSE NULL
      END as notes
    FROM auth.users
    WHERE id IN (
      SELECT id FROM auth.users 
      WHERE (auth.users.raw_user_meta_data->>'role')::text = 'member'
      OR (auth.users.raw_user_meta_data->>'role') IS NULL
      LIMIT 10
    )
    LIMIT 20;
  END IF;
  
  -- Get a submission ID to add notes to
  SELECT id INTO submission_id FROM symptom_submissions LIMIT 1;
  
  -- Only proceed if we have a submission and a valid user ID
  IF submission_id IS NOT NULL AND user_id IS NOT NULL THEN
    -- Insert sample provider notes if none exist
    IF NOT EXISTS (SELECT 1 FROM provider_notes LIMIT 1) THEN
      INSERT INTO provider_notes (
        submission_id,
        provider_id,
        content,
        created_at
      ) VALUES
      (
        submission_id,
        user_id,
        'Patient has a history of similar symptoms. Will need to review previous records.',
        now() - interval '2 days'
      );
      
      -- Add a second note
      INSERT INTO provider_notes (
        submission_id,
        provider_id,
        content,
        created_at
      ) VALUES
      (
        submission_id,
        user_id,
        'Symptoms suggest possible viral infection. Monitoring recommended.',
        now() - interval '1 day'
      );
    END IF;
    
    -- Get a submission ID with Reviewed or Scheduled status
    SELECT id INTO submission_id FROM symptom_submissions 
    WHERE status IN ('Reviewed', 'Scheduled') 
    LIMIT 1;
    
    -- Only proceed if we have a submission with the right status
    IF submission_id IS NOT NULL THEN
      -- Insert sample provider replies if none exist
      IF NOT EXISTS (SELECT 1 FROM provider_replies LIMIT 1) THEN
        INSERT INTO provider_replies (
          submission_id,
          provider_id,
          content,
          created_at
        ) VALUES
        (
          submission_id,
          user_id,
          'Thank you for your submission. Based on your symptoms, I recommend scheduling a virtual consultation to discuss treatment options.',
          now() - interval '3 days'
        );
      END IF;
    END IF;
  END IF;
END $$;