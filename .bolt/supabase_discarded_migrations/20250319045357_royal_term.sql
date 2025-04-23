/*
  # Fix Test Account Authentication
  
  1. Purpose
    - Properly set up test accounts with all required auth fields
    - Ensure correct role mapping
    - Fix authentication issues
    
  2. Changes
    - Add complete auth configuration
    - Set proper metadata
    - Ensure role is properly set
*/

-- First clean up any existing test accounts
DELETE FROM auth.users WHERE email IN ('test.doctor@vitale.health', 'test.patient@vitale.health');

-- Create test physician
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  last_sign_in_at,
  confirmation_sent_at
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'authenticated',
  'authenticated',
  'test.doctor@vitale.health',
  crypt('Doctor123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"physician"}',
  false,
  now(),
  now(),
  now(),
  now()
);

-- Create test patient
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  last_sign_in_at,
  confirmation_sent_at
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'authenticated',
  'authenticated',
  'test.patient@vitale.health',
  crypt('Patient123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"patient"}',
  false,
  now(),
  now(),
  now(),
  now()
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