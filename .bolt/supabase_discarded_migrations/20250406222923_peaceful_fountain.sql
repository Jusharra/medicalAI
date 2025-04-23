/*
  # Add Storage Bucket for Symptom Uploads

  1. Changes
    - Create a new storage bucket for symptom uploads
    - Set up RLS policies for the bucket

  2. Security
    - Enable RLS
    - Add policies for:
      - Members to upload and view their own files
      - Partners to view files for assigned patients
      - Admins to manage all files
*/

-- Create storage bucket for symptom uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('symptom_uploads', 'Symptom Uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the bucket
CREATE POLICY "Members can upload their own files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'symptom_uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Members can view their own files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'symptom_uploads' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Partners can view assigned patient files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'symptom_uploads' AND
    EXISTS (
      SELECT 1 FROM symptom_submissions
      WHERE symptom_submissions.id::text = (storage.foldername(name))[2]
      AND symptom_submissions.assigned_partner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all files"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'symptom_uploads' AND
    (auth.jwt() ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    bucket_id = 'symptom_uploads' AND
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Note: Removed the CORS settings update since the cors_rules column doesn't exist