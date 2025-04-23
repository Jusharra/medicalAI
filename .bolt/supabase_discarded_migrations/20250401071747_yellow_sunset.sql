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
    
    -- Drop all indexes
    DROP INDEX IF EXISTS profiles_username_idx;
    DROP INDEX IF EXISTS profiles_id_idx;
    
    RAISE NOTICE 'Successfully removed all auth-related objects';
EXCEPTION
    WHEN undefined_object THEN 
        RAISE NOTICE 'Some objects did not exist, continuing...';
END $$;

-- Create minimal profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;