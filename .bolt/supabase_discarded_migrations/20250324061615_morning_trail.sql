-- Update postgres role search path to prioritize auth schema
ALTER ROLE postgres SET search_path = "$user", auth, public;

-- Ensure the change takes effect in the current session
SET search_path = "$user", auth, public;