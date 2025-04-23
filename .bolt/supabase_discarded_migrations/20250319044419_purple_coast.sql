/*
  # Add Test Physician Account

  1. Purpose
    - Create a test physician account for testing
    - Set up initial profile data
    - Configure proper role and permissions

  2. Security
    - Use secure password hashing
    - Set up proper role assignments
*/

-- Create test physician user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'test.physician@vitale.health',
  crypt('Physician123!', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- Create physician profile
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
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Dr. John',
  'Smith',
  '+1-555-0123',
  'physician',
  'MD123456',
  ARRAY['Cardiology', 'Internal Medicine'],
  15,
  '[{"degree": "MD", "institution": "Harvard Medical School", "year": 2008}, {"degree": "Residency", "institution": "Mayo Clinic", "year": 2012}]'::jsonb,
  ARRAY['Board Certified - Cardiology', 'Advanced Cardiac Life Support'],
  250.00,
  now(),
  now()
);

-- Add identity for auth
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  jsonb_build_object('sub', '11111111-1111-1111-1111-111111111111', 'email', 'test.physician@vitale.health'),
  'email',
  'test.physician@vitale.health',
  now(),
  now()
);