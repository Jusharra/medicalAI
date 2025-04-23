/*
  # Update Super Admin Account
  
  1. Changes
    - Safely update super admin email
    - Handle existing email conflicts
    - Ensure admin role is set correctly
    
  2. Security
    - Maintain data integrity
    - Prevent duplicate emails
*/

DO $$ 
DECLARE
  target_email TEXT := '1stchoicecyber@gmail.com';
  existing_user_id UUID;
  admin_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- Check if email already exists
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = target_email;

  -- If email exists but not for admin, delete that user first
  IF existing_user_id IS NOT NULL AND existing_user_id != admin_id THEN
    -- Delete the existing user's data
    DELETE FROM auth.users WHERE id = existing_user_id;
  END IF;

  -- Now safe to update admin email
  UPDATE auth.users
  SET email = target_email,
      email_confirmed_at = now(),
      updated_at = now()
  WHERE id = admin_id;

  -- Update admin profile
  UPDATE profiles
  SET role = 'admin',
      updated_at = now()
  WHERE id = admin_id;

END $$;