-- Drop custom tables if they exist
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom functions if they exist
DO $$ 
BEGIN
    -- Drop functions safely
    DROP FUNCTION IF EXISTS update_updated_at CASCADE;
    DROP FUNCTION IF EXISTS store_role_in_users CASCADE;
EXCEPTION
    WHEN undefined_function THEN
        NULL;
END $$;

-- Drop custom triggers if they exist
DO $$ 
BEGIN
    -- Drop triggers safely
    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_users_updated_at'
    ) THEN
        DROP TRIGGER update_users_updated_at ON users;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON users;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;