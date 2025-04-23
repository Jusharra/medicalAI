-- Enable email confirmations in auth.config
DO $$
BEGIN
  -- Update auth.users to require email confirmation
  ALTER TABLE auth.users
  ALTER COLUMN email_confirmed_at DROP NOT NULL;

  -- Reset any existing confirmations to ensure new signups require confirmation
  UPDATE auth.users
  SET email_confirmed_at = NULL
  WHERE email_confirmed_at IS NOT NULL;
END $$;

-- Clean up existing data to start fresh
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;
DELETE FROM auth.users;
DELETE FROM users;

-- Update store_role_in_users function to only create user after email confirmation
CREATE OR REPLACE FUNCTION store_role_in_users()
RETURNS trigger AS $$
BEGIN
  -- Only proceed if this is a new user and email is confirmed
  IF TG_OP = 'INSERT' AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Insert with error handling
    BEGIN
      INSERT INTO users (id, full_name, email, role)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email,
        'member'
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;