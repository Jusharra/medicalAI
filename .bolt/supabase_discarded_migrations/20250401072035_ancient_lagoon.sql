-- Disable RLS on auth.users and profiles
DO $$ 
BEGIN
    -- Disable RLS on auth.users
    ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies on profiles
    DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
    
    -- Disable RLS on profiles
    ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE 'Successfully disabled RLS on auth.users and profiles';
EXCEPTION
    WHEN undefined_object THEN 
        RAISE NOTICE 'Some objects did not exist, continuing...';
END $$;