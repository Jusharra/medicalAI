/*
  # Add admin role and update policies

  1. Changes
    - Add 'admin' to user_role enum in a transaction
    - Create admin-specific policies
    - Update existing policies to include admin access

  2. Security
    - Enable RLS
    - Add policies for admin role
*/

-- Wrap enum modification in a transaction
BEGIN;

-- Add admin to user_role enum
ALTER TYPE user_role ADD VALUE 'admin';

COMMIT;

-- Update policies to include admin access
DROP POLICY IF EXISTS "Professionals can view assigned patients" ON profiles;
CREATE POLICY "Professionals and admins can view patients"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid()::uuid = id OR  -- Users can view their own profile
    (SELECT role FROM profiles WHERE id = auth.uid()::uuid) = 'admin' OR  -- Admins can view all profiles
    (EXISTS (                 -- Professionals can view their patients' profiles
      SELECT 1 FROM appointments a
      WHERE a.provider::uuid = auth.uid()::uuid
      AND a.profile_id = profiles.id
    ))
  );

-- Add admin-specific policies
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid()::uuid = id OR  -- Users can update their own profile
    (SELECT role FROM profiles WHERE id = auth.uid()::uuid) = 'admin'  -- Admins can update any profile
  )
  WITH CHECK (
    auth.uid()::uuid = id OR
    (SELECT role FROM profiles WHERE id = auth.uid()::uuid) = 'admin'
  );

-- Add admin access to other tables
DO $$ BEGIN
  -- Appointments table
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'appointments' 
    AND policyname = 'Admins can view all appointments'
  ) THEN
    ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admins can view all appointments"
      ON appointments
      FOR ALL
      TO authenticated
      USING ((SELECT role FROM profiles WHERE id = auth.uid()::uuid) = 'admin');
  END IF;

  -- Medical records table
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'medical_records' 
    AND policyname = 'Admins can view all medical records'
  ) THEN
    ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admins can view all medical records"
      ON medical_records
      FOR ALL
      TO authenticated
      USING ((SELECT role FROM profiles WHERE id = auth.uid()::uuid) = 'admin');
  END IF;

  -- Health metrics table
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'health_metrics' 
    AND policyname = 'Admins can view all health metrics'
  ) THEN
    ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admins can view all health metrics"
      ON health_metrics
      FOR ALL
      TO authenticated
      USING ((SELECT role FROM profiles WHERE id = auth.uid()::uuid) = 'admin');
  END IF;
END $$;