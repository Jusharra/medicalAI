/*
  # Create Test Accounts
  
  1. Purpose
    - Create test accounts for both physician and patient roles
    - Ensure proper auth setup with valid passwords
    - Set up complete profiles
*/

-- First clean up any existing test accounts
DELETE FROM auth.users WHERE email IN ('test.doctor@vitale.health', 'test.patient@vitale.health');

-- Create test physician
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'test.doctor@vitale.health',
  crypt('Doctor123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
);

-- Create test patient
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'test.patient@vitale.health',
  crypt('Patient123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
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
  updated_at
) VALUES
(
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222',
  jsonb_build_object('sub', '22222222-2222-2222-2222-222222222222', 'email', 'test.doctor@vitale.health'),
  'email',
  'test.doctor@vitale.health',
  now(),
  now()
),
(
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  jsonb_build_object('sub', '33333333-3333-3333-3333-333333333333', 'email', 'test.patient@vitale.health'),
  'email',
  'test.patient@vitale.health',
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