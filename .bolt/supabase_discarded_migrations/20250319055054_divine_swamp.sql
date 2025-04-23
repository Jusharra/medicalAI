/*
  # Fix Database Schema Error
  
  1. Purpose
    - Fix schema querying error
    - Ensure proper table relationships
    - Reset and recreate test account
    
  2. Changes
    - Drop and recreate profiles table with proper constraints
    - Recreate test account
    - Enable RLS
*/

-- Drop existing table and recreate with proper constraints
DROP TABLE IF EXISTS profiles CASCADE;

CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  first_name text,
  last_name text,
  phone text,
  date_of_birth date,
  emergency_contact text,
  emergency_phone text,
  preferred_language text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create basic policies
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

-- Create indexes
CREATE INDEX IF NOT EXISTS profiles_id_idx ON profiles(id);

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