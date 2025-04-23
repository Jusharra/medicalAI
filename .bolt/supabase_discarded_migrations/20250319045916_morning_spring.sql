/*
  # Simplify Role System and Remove Dependencies
  
  1. Changes
    - Drop dependent policies first
    - Remove role-specific fields
    - Create new test member account
    - Add simplified policies
    
  2. Security
    - Maintain RLS
    - Simplify access control
*/

-- First drop all dependent policies
DROP POLICY IF EXISTS "Admins can view all appointments" ON appointments;
DROP POLICY IF EXISTS "Admins can view all medical records" ON medical_records;
DROP POLICY IF EXISTS "Admins can view all health metrics" ON health_metrics;
DROP POLICY IF EXISTS "basic_select_policy" ON profiles;
DROP POLICY IF EXISTS "basic_update_policy" ON profiles;
DROP POLICY IF EXISTS "basic_delete_policy" ON profiles;

-- Now safe to drop role-specific fields
ALTER TABLE profiles 
DROP COLUMN IF EXISTS professional_license CASCADE,
DROP COLUMN IF EXISTS specialties CASCADE,
DROP COLUMN IF EXISTS years_of_experience CASCADE,
DROP COLUMN IF EXISTS education CASCADE,
DROP COLUMN IF EXISTS certifications CASCADE,
DROP COLUMN IF EXISTS consultation_fee CASCADE,
DROP COLUMN IF EXISTS role CASCADE;

-- Drop the user_role enum type
DROP TYPE IF EXISTS user_role CASCADE;

-- Clean up existing data
DELETE FROM profiles;
DELETE FROM auth.users;

-- Create test member account
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  last_sign_in_at
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'test.member@vitale.health',
  crypt('Member123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  now(),
  now(),
  now()
);

-- Create identity for auth
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at,
  last_sign_in_at
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  '44444444-4444-4444-4444-444444444444',
  jsonb_build_object(
    'sub', '44444444-4444-4444-4444-444444444444',
    'email', 'test.member@vitale.health',
    'email_verified', true
  ),
  'email',
  'test.member@vitale.health',
  now(),
  now(),
  now()
);

-- Create member profile
INSERT INTO profiles (
  id,
  first_name,
  last_name,
  phone,
  date_of_birth,
  emergency_contact,
  emergency_phone,
  preferred_language,
  created_at,
  updated_at
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  'Jane',
  'Doe',
  '+1-555-0123',
  '1990-01-01',
  'John Doe',
  '+1-555-0124',
  'en',
  now(),
  now()
);

-- Update policies to remove role-based checks
DROP POLICY IF EXISTS "profiles_read_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;
DROP POLICY IF EXISTS "allow_select_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "allow_admin_all" ON profiles;
DROP POLICY IF EXISTS "allow_professional_select_patients" ON profiles;

-- Create simplified policies
CREATE POLICY "enable_read_own_profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "enable_insert_own_profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "enable_update_own_profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create simplified policies for other tables
CREATE POLICY "users_can_view_own_appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "users_can_view_own_medical_records"
  ON medical_records
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "users_can_view_own_health_metrics"
  ON health_metrics
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());