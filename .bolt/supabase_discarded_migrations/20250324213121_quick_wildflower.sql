-- Drop custom tables if they exist
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop custom functions if they exist
DROP FUNCTION IF EXISTS update_updated_at CASCADE;
DROP FUNCTION IF EXISTS store_role_in_users CASCADE;

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
END $$;