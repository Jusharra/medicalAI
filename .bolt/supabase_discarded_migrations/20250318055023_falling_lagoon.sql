/*
  # Add Test Medical Professionals

  1. New Data
    - Creates test users for:
      - 2 Physicians
      - 2 Nurses
      - 1 Admin
    
  2. Details
    - Each professional has complete profile information
    - Includes specialties, experience, and education
    - All passwords are set to 'Password123!'
*/

-- Insert test users with auth.users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES
  -- Physicians
  ('11111111-1111-1111-1111-111111111111', 'dr.smith@vitale.health', crypt('Password123!', gen_salt('bf')), now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'dr.patel@vitale.health', crypt('Password123!', gen_salt('bf')), now(), now(), now()),
  
  -- Nurses
  ('33333333-3333-3333-3333-333333333333', 'nurse.johnson@vitale.health', crypt('Password123!', gen_salt('bf')), now(), now(), now()),
  ('44444444-4444-4444-4444-444444444444', 'nurse.garcia@vitale.health', crypt('Password123!', gen_salt('bf')), now(), now(), now()),
  
  -- Admin
  ('55555555-5555-5555-5555-555555555555', 'admin@vitale.health', crypt('Password123!', gen_salt('bf')), now(), now(), now());

-- Insert corresponding profiles
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
  availability,
  consultation_fee,
  created_at,
  updated_at
)
VALUES
  -- Dr. Smith - Cardiologist
  (
    '11111111-1111-1111-1111-111111111111',
    'Robert',
    'Smith',
    '+1-555-0123',
    'physician',
    'MD123456',
    ARRAY['Cardiology', 'Internal Medicine'],
    15,
    '[{"degree": "MD", "institution": "Harvard Medical School", "year": 2008}, {"degree": "Residency", "institution": "Mayo Clinic", "year": 2012}]'::jsonb,
    ARRAY['Board Certified - Cardiology', 'Advanced Cardiac Life Support'],
    '{"monday": {"start": "09:00", "end": "17:00"}, "wednesday": {"start": "09:00", "end": "17:00"}, "friday": {"start": "09:00", "end": "15:00"}}'::jsonb,
    250.00,
    now(),
    now()
  ),
  
  -- Dr. Patel - Neurologist
  (
    '22222222-2222-2222-2222-222222222222',
    'Priya',
    'Patel',
    '+1-555-0124',
    'physician',
    'MD789012',
    ARRAY['Neurology', 'Sleep Medicine'],
    12,
    '[{"degree": "MD", "institution": "Stanford University", "year": 2011}, {"degree": "Residency", "institution": "Johns Hopkins", "year": 2015}]'::jsonb,
    ARRAY['Board Certified - Neurology', 'Sleep Medicine Certification'],
    '{"tuesday": {"start": "08:00", "end": "16:00"}, "thursday": {"start": "08:00", "end": "16:00"}}'::jsonb,
    275.00,
    now(),
    now()
  ),
  
  -- Nurse Johnson
  (
    '33333333-3333-3333-3333-333333333333',
    'Sarah',
    'Johnson',
    '+1-555-0125',
    'nurse',
    'RN345678',
    ARRAY['Critical Care', 'Emergency Medicine'],
    8,
    '[{"degree": "BSN", "institution": "University of Pennsylvania", "year": 2015}]'::jsonb,
    ARRAY['Registered Nurse', 'Critical Care Certified'],
    '{"monday": {"start": "07:00", "end": "19:00"}, "tuesday": {"start": "07:00", "end": "19:00"}, "wednesday": {"start": "07:00", "end": "19:00"}}'::jsonb,
    150.00,
    now(),
    now()
  ),
  
  -- Nurse Garcia
  (
    '44444444-4444-4444-4444-444444444444',
    'Miguel',
    'Garcia',
    '+1-555-0126',
    'nurse',
    'RN901234',
    ARRAY['Pediatrics', 'Family Medicine'],
    6,
    '[{"degree": "BSN", "institution": "UCLA", "year": 2017}]'::jsonb,
    ARRAY['Registered Nurse', 'Pediatric Nursing Certified'],
    '{"thursday": {"start": "09:00", "end": "21:00"}, "friday": {"start": "09:00", "end": "21:00"}, "saturday": {"start": "09:00", "end": "17:00"}}'::jsonb,
    125.00,
    now(),
    now()
  ),
  
  -- Admin User
  (
    '55555555-5555-5555-5555-555555555555',
    'Admin',
    'User',
    '+1-555-0127',
    'admin',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    now(),
    now()
  );

-- Add identities for auth
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    jsonb_build_object('sub', '11111111-1111-1111-1111-111111111111', 'email', 'dr.smith@vitale.health'),
    'email',
    'dr.smith@vitale.health',
    now(),
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    jsonb_build_object('sub', '22222222-2222-2222-2222-222222222222', 'email', 'dr.patel@vitale.health'),
    'email',
    'dr.patel@vitale.health',
    now(),
    now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    jsonb_build_object('sub', '33333333-3333-3333-3333-333333333333', 'email', 'nurse.johnson@vitale.health'),
    'email',
    'nurse.johnson@vitale.health',
    now(),
    now()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    jsonb_build_object('sub', '44444444-4444-4444-4444-444444444444', 'email', 'nurse.garcia@vitale.health'),
    'email',
    'nurse.garcia@vitale.health',
    now(),
    now()
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '55555555-5555-5555-5555-555555555555',
    jsonb_build_object('sub', '55555555-5555-5555-5555-555555555555', 'email', 'admin@vitale.health'),
    'email',
    'admin@vitale.health',
    now(),
    now()
  );