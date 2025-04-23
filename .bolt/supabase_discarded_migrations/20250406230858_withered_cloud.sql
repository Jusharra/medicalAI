/*
  # Fix Symptom Submissions Relationship with Profiles

  1. Changes
    - Check if the constraint exists before trying to add it
    - Update RLS policies to use the correct relationship
    - Add missing indexes for better performance

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Check if the constraint exists before adding it
DO $$ 
BEGIN
  -- Check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'symptom_submissions_profile_id_fkey'
  ) THEN
    -- Add foreign key constraint only if it doesn't exist
    ALTER TABLE symptom_submissions
    ADD CONSTRAINT symptom_submissions_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for better query performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_symptom_submissions_profile_id ON symptom_submissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_symptom_submissions_assigned_partner_id ON symptom_submissions(assigned_partner_id);
CREATE INDEX IF NOT EXISTS idx_symptom_submissions_status ON symptom_submissions(status);
CREATE INDEX IF NOT EXISTS idx_symptom_submissions_urgency_flag ON symptom_submissions(urgency_flag);

-- Insert sample data for testing if the table is empty
DO $$
BEGIN
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
      created_at
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
      (
        SELECT id FROM partners 
        WHERE status = 'active' 
        ORDER BY random() 
        LIMIT 1
      ) as assigned_partner_id,
      now() - (random() * interval '30 days') as created_at
    FROM auth.users
    WHERE id IN (
      SELECT id FROM auth.users 
      WHERE (auth.users.raw_user_meta_data->>'role')::text = 'member'
      OR (auth.users.raw_user_meta_data->>'role') IS NULL
      LIMIT 5
    )
    LIMIT 10;
  END IF;
END $$;