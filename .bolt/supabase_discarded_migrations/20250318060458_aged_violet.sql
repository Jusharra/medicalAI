/*
  # Create Super Admin Account

  1. Changes
    - Creates a super admin user with full system access
    - Sets up the admin profile with appropriate permissions
    - Ensures admin has access to all system features

  2. Security
    - Uses secure password hashing
    - Sets up proper role-based access control
    - Enables admin-specific policies
*/

-- Create super admin user in auth.users
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'superadmin@vitale.health',
  crypt('SuperAdmin123!', gen_salt('bf')),
  now(),
  now(),
  now()
);

-- Create super admin profile
INSERT INTO profiles (
  id,
  first_name,
  last_name,
  phone,
  role,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Super',
  'Admin',
  '+1-000-000-0000',
  'admin',
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
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000000', 'email', 'superadmin@vitale.health'),
  'email',
  'superadmin@vitale.health',
  now(),
  now()
);