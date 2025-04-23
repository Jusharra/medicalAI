-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.store_role_in_users();

-- Create improved function for user creation with better error handling
CREATE OR REPLACE FUNCTION public.store_role_in_users()
RETURNS TRIGGER AS $$
DECLARE
  default_role_id uuid;
BEGIN
  -- Get the default member role ID
  SELECT id INTO default_role_id
  FROM public.roles
  WHERE name = 'member'
  LIMIT 1;

  -- Create user profile with minimal required data
  BEGIN
    INSERT INTO public.user_profiles (
      user_id,
      email
    ) VALUES (
      NEW.id,
      NEW.email
    ) ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE NOTICE 'Error creating user profile: %', SQLERRM;
  END;

  -- Assign default member role if role exists
  IF default_role_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.user_roles (
        user_id,
        role_id
      ) VALUES (
        NEW.id,
        default_role_id
      ) ON CONFLICT (user_id, role_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE NOTICE 'Error assigning default role: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.store_role_in_users();

-- Verify function exists
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'store_role_in_users'
  ), 'Function store_role_in_users does not exist';
END $$;

-- Verify trigger exists
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ), 'Trigger on_auth_user_created does not exist';
END $$;

-- Add missing profiles and roles for existing users
DO $$
BEGIN
  -- Add missing profiles
  INSERT INTO public.user_profiles (user_id, email)
  SELECT id, email
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles p WHERE p.user_id = u.id
  );

  -- Add missing member role assignments
  INSERT INTO public.user_roles (user_id, role_id)
  SELECT u.id, r.id
  FROM auth.users u
  CROSS JOIN public.roles r
  WHERE r.name = 'member'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = u.id AND ur.role_id = r.id
  );
END $$;