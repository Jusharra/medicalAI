/*
  # Add Professional Roles and Dashboard Access

  1. Changes
    - Add role enum type for user roles
    - Add role column to profiles table
    - Add professional-specific fields to profiles
    - Create policies for professional access

  2. Security
    - Enable RLS for all new tables
    - Add policies for role-based access
*/

-- Create role enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('patient', 'physician', 'nurse');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'patient',
ADD COLUMN IF NOT EXISTS professional_license TEXT,
ADD COLUMN IF NOT EXISTS specialties TEXT[],
ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
ADD COLUMN IF NOT EXISTS education JSONB,
ADD COLUMN IF NOT EXISTS certifications TEXT[],
ADD COLUMN IF NOT EXISTS availability JSONB,
ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC;

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- Update policies for professional access
DROP POLICY IF EXISTS "Professionals can view assigned patients" ON profiles;
CREATE POLICY "Professionals can view assigned patients"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid()::uuid = id) OR  -- Users can view their own profile
    (EXISTS (            -- Professionals can view their patients' profiles
      SELECT 1 FROM appointments a
      WHERE a.provider::uuid = auth.uid()::uuid
      AND a.profile_id = profiles.id
    ))
  );

-- Add policy for updating professional details
DROP POLICY IF EXISTS "Professionals can update their details" ON profiles;
CREATE POLICY "Professionals can update their details"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::uuid = id AND role IN ('physician', 'nurse'))
  WITH CHECK (auth.uid()::uuid = id AND role IN ('physician', 'nurse'));