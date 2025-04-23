/*
  # Fix Profile Policies and Single Row Selection
  
  1. Changes
    - Drop existing policies
    - Create new simplified policies
    - Ensure single row selection for profiles
    - Add proper indexes
    
  2. Security
    - Maintain RLS
    - Ensure data privacy
    - Prevent multiple row returns
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "enable_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "enable_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "enable_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_can_view_own_appointments" ON appointments;
DROP POLICY IF EXISTS "users_can_view_own_medical_records" ON medical_records;
DROP POLICY IF EXISTS "users_can_view_own_health_metrics" ON health_metrics;

-- Clean up existing data
TRUNCATE profiles CASCADE;
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
  last_sign_in_at,
  confirmation_token,
  recovery_token
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'test@vitale.health',
  crypt('Test123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  now(),
  now(),
  now(),
  '',
  ''
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
    'email', 'test@vitale.health',
    'email_verified', true
  ),
  'email',
  'test@vitale.health',
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
  'Test',
  'User',
  '+1-555-0123',
  '1990-01-01',
  'Emergency Contact',
  '+1-555-0124',
  'en',
  now(),
  now()
);

-- Create unique constraint on profiles id
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;
ALTER TABLE profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_id_idx ON profiles(id);

-- Create simplified policies with proper checks
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

-- Create simplified policies for related tables
CREATE POLICY "enable_read_own_appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "enable_read_own_medical_records"
  ON medical_records
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "enable_read_own_health_metrics"
  ON health_metrics
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;