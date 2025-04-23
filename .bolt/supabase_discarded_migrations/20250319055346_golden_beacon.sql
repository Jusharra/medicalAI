/*
  # Fix Database Schema Foundation
  
  1. Purpose
    - Create base tables in correct order
    - Ensure proper foreign key relationships
    - Set up test account correctly
    
  2. Changes
    - Drop and recreate all core tables
    - Set up proper constraints
    - Create test account
*/

-- Drop existing tables in correct order
DROP TABLE IF EXISTS health_metrics CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table first (core table)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  phone text,
  date_of_birth date,
  emergency_contact text,
  emergency_phone text,
  preferred_language text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointments table
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  appointment_date timestamptz NOT NULL,
  appointment_type text NOT NULL,
  provider text,
  status text DEFAULT 'scheduled',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create medical_records table
CREATE TABLE medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  record_type text NOT NULL,
  record_date date NOT NULL,
  description text NOT NULL,
  provider text,
  attachments jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create health_metrics table
CREATE TABLE health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  measured_at timestamptz NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
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

-- Create policies for related tables
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_appointments_profile_id ON appointments(profile_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_profile_id ON medical_records(profile_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_profile_id ON health_metrics(profile_id);

-- Clean up existing data
DELETE FROM auth.users WHERE email = 'test@vitale.health';

-- Create test account
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
  'efbd2fb4-4a3b-4d6e-a553-eec02a567ba8',
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

-- Create identity
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
  'efbd2fb4-4a3b-4d6e-a553-eec02a567ba8',
  'efbd2fb4-4a3b-4d6e-a553-eec02a567ba8',
  jsonb_build_object(
    'sub', 'efbd2fb4-4a3b-4d6e-a553-eec02a567ba8',
    'email', 'test@vitale.health',
    'email_verified', true
  ),
  'email',
  'test@vitale.health',
  now(),
  now(),
  now()
);

-- Create profile
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
  'efbd2fb4-4a3b-4d6e-a553-eec02a567ba8',
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