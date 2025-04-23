/*
  # Fix Authentication Setup
  
  1. Purpose
    - Create test accounts with proper role mapping
    - Ensure all required auth fields are present
    - Set up complete user profiles
    
  2. Security
    - Use secure password hashing
    - Set proper authentication flags
    - Enable email verification
*/

-- First clean up any existing test accounts
DELETE FROM profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email IN ('test.doctor@vitale.health', 'test.patient@vitale.health')
);
DELETE FROM auth.users WHERE email IN ('test.doctor@vitale.health', 'test.patient@vitale.health');

-- Create test physician
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'test.doctor@vitale.health',
  crypt('Doctor123!', gen_salt('bf')),
  now(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"role": "physician"}',
  false,
  now(),
  now(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL
);

-- Create test patient with same fields
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'test.patient@vitale.health',
  crypt('Patient123!', gen_salt('bf')),
  now(),
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"role": "patient"}',
  false,
  now(),
  now(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL,
  false,
  NULL
);

-- Create identities for auth
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at,
  last_sign_in_at
) VALUES
(
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  jsonb_build_object(
    'sub', '22222222-2222-2222-2222-222222222222',
    'email', 'test.doctor@vitale.health',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  'test.doctor@vitale.health',
  now(),
  now(),
  now()
),
(
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  jsonb_build_object(
    'sub', '33333333-3333-3333-3333-333333333333',
    'email', 'test.patient@vitale.health',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  'test.patient@vitale.health',
  now(),
  now(),
  now()
);

-- Create profiles
INSERT INTO profiles (
  id,
  first_name,
  last_name,
  phone,
  role,
  professional_license,
  specialties,
  years_of_experience,
  education,
  certifications,
  consultation_fee,
  created_at,
  updated_at
) VALUES
(
  '22222222-2222-2222-2222-222222222222',
  'Dr. Sarah',
  'Chen',
  '+1-555-0123',
  'physician',
  'MD123456',
  ARRAY['Cardiology', 'Internal Medicine'],
  15,
  '[{"degree": "MD", "institution": "Stanford Medical School", "year": 2008}, {"degree": "Residency", "institution": "Mayo Clinic", "year": 2012}]'::jsonb,
  ARRAY['Board Certified - Cardiology', 'Advanced Cardiac Life Support'],
  250.00,
  now(),
  now()
),
(
  '33333333-3333-3333-3333-333333333333',
  'John',
  'Smith',
  '+1-555-0124',
  'patient',
  null,
  null,
  null,
  null,
  null,
  null,
  now(),
  now()
);