/*
  # Fix Profile Table Structure and Policies

  1. Changes
    - Ensure profiles table has correct structure
    - Update RLS policies safely
    - Add necessary triggers and indexes

  2. Security
    - Enable RLS
    - Update policies with proper checks
    - Ensure no duplicate policies
*/

-- Ensure profiles table has correct structure
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  phone text,
  date_of_birth date,
  emergency_contact text,
  emergency_phone text,
  preferred_language text DEFAULT 'en',
  role user_role DEFAULT 'patient',
  professional_license text,
  specialties text[],
  years_of_experience integer,
  education jsonb,
  certifications text[],
  availability jsonb,
  consultation_fee numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Professionals can view assigned patients" ON profiles;
DROP POLICY IF EXISTS "Professionals and admins can view patients" ON profiles;
DROP POLICY IF EXISTS "Professionals can update their details" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Create new policies
CREATE POLICY "Users can create own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Combined policy for professionals and admins
CREATE POLICY "Access control for professionals and admins"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('physician', 'nurse') AND
      EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.provider::uuid = auth.uid()
        AND a.profile_id = profiles.id
      )
    )
  )
  WITH CHECK (
    auth.uid() = id OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- Create new trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for role-based queries if not exists
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);