-- Drop all existing auth-related objects
DO $$ 
BEGIN
    -- Drop all triggers
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    
    -- Drop all functions
    DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
    DROP FUNCTION IF EXISTS public.initialize_user_profile() CASCADE;
    DROP FUNCTION IF EXISTS public.store_role_in_users() CASCADE;
    
    -- Drop all tables
    DROP TABLE IF EXISTS profiles CASCADE;
    
    RAISE NOTICE 'Successfully removed all auth-related objects';
EXCEPTION
    WHEN undefined_object THEN 
        RAISE NOTICE 'Some objects did not exist, continuing...';
END $$;

-- Create minimal profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  avatar_url text,
  updated_at timestamptz DEFAULT now()
);

-- Disable RLS on auth.users and profiles
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Create index
CREATE INDEX profiles_id_idx ON profiles(id);

-- Add missing profiles for existing users
INSERT INTO profiles (id, email)
SELECT id, email
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.users.id
)
ON CONFLICT (id) DO NOTHING;