/*
  # Add Symptom Submissions and Related Tables

  1. New Tables
    - `symptom_submissions` - Stores patient symptom submissions
    - `submission_files` - Stores files attached to symptom submissions
    - `provider_notes` - Stores provider notes on submissions
    - `provider_replies` - Stores provider replies to patients
    - `ai_feedback` - Stores provider feedback on AI suggestions
    - `triage_activity_logs` - Tracks all activity related to symptom triage

  2. Security
    - Enable RLS
    - Add policies for:
      - Members to manage their own submissions
      - Partners to view and update assigned submissions
      - Admins to manage all submissions
*/

-- Create symptom_submissions table
CREATE TABLE IF NOT EXISTS symptom_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  symptoms text NOT NULL,
  duration text,
  severity integer,
  onset_date date,
  status text NOT NULL DEFAULT 'Submitted',
  urgency_flag text NOT NULL DEFAULT 'Low',
  ai_assessment text,
  ai_risk_level text,
  ai_confidence numeric,
  assigned_partner_id uuid REFERENCES partners(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text
);

-- Create submission_files table
CREATE TABLE IF NOT EXISTS submission_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES symptom_submissions(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create provider_notes table
CREATE TABLE IF NOT EXISTS provider_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES symptom_submissions(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create provider_replies table
CREATE TABLE IF NOT EXISTS provider_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES symptom_submissions(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create ai_feedback table
CREATE TABLE IF NOT EXISTS ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES symptom_submissions(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_helpful boolean NOT NULL,
  feedback_type text NOT NULL,
  comments text,
  created_at timestamptz DEFAULT now()
);

-- Create triage_activity_logs table
CREATE TABLE IF NOT EXISTS triage_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES symptom_submissions(id) ON DELETE CASCADE,
  action text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  details text,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE symptom_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for symptom_submissions
CREATE POLICY "Members can manage their own submissions"
  ON symptom_submissions
  FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Partners can view and update assigned submissions"
  ON symptom_submissions
  FOR ALL
  TO authenticated
  USING (
    assigned_partner_id = auth.uid() OR
    (auth.jwt() ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    assigned_partner_id = auth.uid() OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create policies for submission_files
CREATE POLICY "Members can view their own submission files"
  ON submission_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM symptom_submissions
      WHERE symptom_submissions.id = submission_files.submission_id
      AND symptom_submissions.profile_id = auth.uid()
    )
  );

CREATE POLICY "Partners can view assigned submission files"
  ON submission_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM symptom_submissions
      WHERE symptom_submissions.id = submission_files.submission_id
      AND (
        symptom_submissions.assigned_partner_id = auth.uid() OR
        (auth.jwt() ->> 'role')::text = 'admin'
      )
    )
  );

CREATE POLICY "Members can add files to their own submissions"
  ON submission_files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM symptom_submissions
      WHERE symptom_submissions.id = submission_files.submission_id
      AND symptom_submissions.profile_id = auth.uid()
    )
  );

-- Create policies for provider_notes
CREATE POLICY "Partners can manage notes for assigned submissions"
  ON provider_notes
  FOR ALL
  TO authenticated
  USING (
    provider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM symptom_submissions
      WHERE symptom_submissions.id = provider_notes.submission_id
      AND symptom_submissions.assigned_partner_id = auth.uid()
    ) OR
    (auth.jwt() ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    provider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM symptom_submissions
      WHERE symptom_submissions.id = provider_notes.submission_id
      AND symptom_submissions.assigned_partner_id = auth.uid()
    ) OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "Members can view notes for their submissions"
  ON provider_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM symptom_submissions
      WHERE symptom_submissions.id = provider_notes.submission_id
      AND symptom_submissions.profile_id = auth.uid()
    )
  );

-- Create policies for provider_replies
CREATE POLICY "Partners can manage replies for assigned submissions"
  ON provider_replies
  FOR ALL
  TO authenticated
  USING (
    provider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM symptom_submissions
      WHERE symptom_submissions.id = provider_replies.submission_id
      AND symptom_submissions.assigned_partner_id = auth.uid()
    ) OR
    (auth.jwt() ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    provider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM symptom_submissions
      WHERE symptom_submissions.id = provider_replies.submission_id
      AND symptom_submissions.assigned_partner_id = auth.uid()
    ) OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "Members can view replies for their submissions"
  ON provider_replies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM symptom_submissions
      WHERE symptom_submissions.id = provider_replies.submission_id
      AND symptom_submissions.profile_id = auth.uid()
    )
  );

-- Create policies for ai_feedback
CREATE POLICY "Partners can manage AI feedback"
  ON ai_feedback
  FOR ALL
  TO authenticated
  USING (
    provider_id = auth.uid() OR
    (auth.jwt() ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    provider_id = auth.uid() OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create policies for triage_activity_logs
CREATE POLICY "Partners can view logs for assigned submissions"
  ON triage_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM symptom_submissions
      WHERE symptom_submissions.id = triage_activity_logs.submission_id
      AND symptom_submissions.assigned_partner_id = auth.uid()
    ) OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "Partners can create logs"
  ON triage_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM symptom_submissions
      WHERE symptom_submissions.id = triage_activity_logs.submission_id
      AND symptom_submissions.assigned_partner_id = auth.uid()
    ) OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_symptom_submissions_profile_id ON symptom_submissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_symptom_submissions_assigned_partner_id ON symptom_submissions(assigned_partner_id);
CREATE INDEX IF NOT EXISTS idx_symptom_submissions_status ON symptom_submissions(status);
CREATE INDEX IF NOT EXISTS idx_symptom_submissions_urgency_flag ON symptom_submissions(urgency_flag);
CREATE INDEX IF NOT EXISTS idx_symptom_submissions_created_at ON symptom_submissions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submission_files_submission_id ON submission_files(submission_id);
CREATE INDEX IF NOT EXISTS idx_provider_notes_submission_id ON provider_notes(submission_id);
CREATE INDEX IF NOT EXISTS idx_provider_notes_provider_id ON provider_notes(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_replies_submission_id ON provider_replies(submission_id);
CREATE INDEX IF NOT EXISTS idx_provider_replies_provider_id ON provider_replies(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_submission_id ON ai_feedback(submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_provider_id ON ai_feedback(provider_id);
CREATE INDEX IF NOT EXISTS idx_triage_activity_logs_submission_id ON triage_activity_logs(submission_id);
CREATE INDEX IF NOT EXISTS idx_triage_activity_logs_user_id ON triage_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_triage_activity_logs_timestamp ON triage_activity_logs(timestamp DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_symptom_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
CREATE TRIGGER update_symptom_submissions_updated_at
  BEFORE UPDATE ON symptom_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_symptom_submissions_updated_at();

-- Create function to log status changes
CREATE OR REPLACE FUNCTION log_symptom_submission_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO triage_activity_logs (
      submission_id,
      action,
      user_id,
      user_name,
      details,
      timestamp
    ) VALUES (
      NEW.id,
      'Status Changed',
      auth.uid(),
      (SELECT full_name FROM profiles WHERE id = auth.uid()),
      format('Status changed from %s to %s', OLD.status, NEW.status),
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for status changes
CREATE TRIGGER log_symptom_submission_status_change_trigger
  AFTER UPDATE OF status ON symptom_submissions
  FOR EACH ROW
  EXECUTE FUNCTION log_symptom_submission_status_change();

-- Insert sample data for testing
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
  now() - (random() * interval '30 days') as created_at
FROM auth.users
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE (auth.users.raw_user_meta_data->>'role')::text = 'member'
  OR (auth.users.raw_user_meta_data->>'role') IS NULL
  LIMIT 10
)
AND NOT EXISTS (
  SELECT 1 FROM symptom_submissions 
  WHERE symptom_submissions.profile_id = auth.users.id
)
LIMIT 20;

-- Assign partners to submissions
UPDATE symptom_submissions
SET assigned_partner_id = (
  SELECT id FROM partners 
  WHERE status = 'active' 
  ORDER BY random() 
  LIMIT 1
)
WHERE assigned_partner_id IS NULL;