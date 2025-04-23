/*
  # Create Test Account with Real UUID
  
  1. Purpose
    - Create test account with proper UUID
    - Set up complete profile data
    - Ensure proper auth configuration
    
  2. Security
    - Use secure password hashing
    - Set proper authentication flags
*/

-- Clean up existing data
TRUNCATE profiles CASCADE;
DELETE FROM auth.users;

-- Create test member account with real UUID
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

-- Ensure constraints and indexes exist
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;
ALTER TABLE profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
CREATE INDEX IF NOT EXISTS profiles_id_idx ON profiles(id);