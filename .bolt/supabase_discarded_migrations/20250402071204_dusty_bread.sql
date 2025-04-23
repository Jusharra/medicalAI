/*
  # Fix Partner Dashboard Access

  1. Changes
    - Set partner role for specific user
    - Update auth.users metadata to include role
    - Create partner record if it doesn't exist
    - Ensure proper RLS policies for partners

  2. Security
    - Maintain existing RLS policies
    - Update role only for specific user
*/

-- First ensure the role column exists and has the correct type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('member', 'admin', 'partner');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Set partner role for specific user
UPDATE users 
SET role = 'partner'
WHERE id = 'c349a285-bc2c-494b-902b-7e35358a495d';

-- Update auth.users metadata to include role
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'partner')
WHERE id = 'c349a285-bc2c-494b-902b-7e35358a495d';

-- Create partner record if it doesn't exist
INSERT INTO partners (
  id,
  name,
  email,
  status,
  practice_name,
  practice_address,
  specialties,
  consultation_fee,
  rating
)
SELECT
  'c349a285-bc2c-494b-902b-7e35358a495d',
  'Dr. ' || COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = 'c349a285-bc2c-494b-902b-7e35358a495d'), 'Partner'),
  'qreative.ambitions@gmail.com',
  'active',
  'Qreative Medical Practice',
  jsonb_build_object(
    'street', '123 Medical Plaza',
    'city', 'San Francisco',
    'state', 'CA',
    'zip', '94105'
  ),
  ARRAY['Primary Care', 'Internal Medicine'],
  299,
  4.8
WHERE NOT EXISTS (
  SELECT 1 FROM partners WHERE id = 'c349a285-bc2c-494b-902b-7e35358a495d'
);

-- Ensure RLS is enabled
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "partners_select" ON partners;

-- Create policies for partners
CREATE POLICY "partners_select"
  ON partners
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "partners_update_own"
  ON partners
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR
    (auth.jwt() ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    id = auth.uid() OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create function to sync role to JWT claims
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS trigger AS $$
BEGIN
  -- Update auth.users metadata when role changes
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to keep role in sync
DROP TRIGGER IF EXISTS sync_user_role_trigger ON users;
CREATE TRIGGER sync_user_role_trigger
  AFTER UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role();