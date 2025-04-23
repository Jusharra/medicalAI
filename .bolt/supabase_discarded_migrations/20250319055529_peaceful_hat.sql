/*
  # Fix Auth Schema Setup
  
  1. Purpose
    - Ensure auth schema exists and is properly configured
    - Set up auth tables in correct order
    - Fix schema querying issues
    
  2. Changes
    - Create auth schema if not exists
    - Set up auth tables with proper constraints
    - Create test account with proper auth setup
*/

-- Create auth schema if not exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Drop existing tables to ensure clean setup
DROP TABLE IF EXISTS health_metrics CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS auth.users CASCADE;
DROP TABLE IF EXISTS auth.identities CASCADE;

-- Create auth.users table
CREATE TABLE auth.users (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid,
  aud character varying(255),
  role character varying(255),
  email character varying(255),
  encrypted_password character varying(255),
  email_confirmed_at timestamp with time zone,
  invited_at timestamp with time zone,
  confirmation_token character varying(255),
  confirmation_sent_at timestamp with time zone,
  recovery_token character varying(255),
  recovery_sent_at timestamp with time zone,
  email_change_token_new character varying(255),
  email_change character varying(255),
  email_change_sent_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  phone character varying(255),
  phone_confirmed_at timestamp with time zone,
  phone_change character varying(255),
  phone_change_token character varying(255),
  phone_change_sent_at timestamp with time zone,
  email_change_token_current character varying(255),
  email_change_confirm_status smallint,
  banned_until timestamp with time zone,
  reauthentication_token character varying(255),
  reauthentication_sent_at timestamp with time zone,
  is_sso_user boolean DEFAULT false,
  deleted_at timestamp with time zone
);

-- Create auth.identities table
CREATE TABLE auth.identities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  identity_data jsonb NOT NULL,
  provider character varying(255) NOT NULL,
  provider_id character varying(255),
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create profiles table
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

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create indexes
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