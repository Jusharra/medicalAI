/*
  # Fix symptom_submissions foreign key relationship

  1. Changes
    - Check if foreign key constraint exists before adding it
    - Update RLS policies to use the relationship

  2. Security
    - Maintain existing RLS policies
    - Ensure proper cascading on delete
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

-- Update RLS policies to use the new relationship
-- First check if policies exist
DO $$ 
BEGIN
  -- Try to update the policies if they exist
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Members can manage their own submissions'
    AND tablename = 'symptom_submissions'
  ) THEN
    ALTER POLICY "Members can manage their own submissions"
    ON symptom_submissions
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Partners can view and update assigned submissions'
    AND tablename = 'symptom_submissions'
  ) THEN
    ALTER POLICY "Partners can view and update assigned submissions"
    ON symptom_submissions
    USING ((assigned_partner_id = auth.uid()) OR (auth.jwt() ->> 'role'::text) = 'admin'::text)
    WITH CHECK ((assigned_partner_id = auth.uid()) OR (auth.jwt() ->> 'role'::text) = 'admin'::text);
  END IF;
END $$;

-- Create indexes for better query performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_symptom_submissions_profile_id ON symptom_submissions(profile_id);