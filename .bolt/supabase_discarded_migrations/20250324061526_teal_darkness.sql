-- Alter the search path to prioritize auth schema
ALTER DATABASE postgres SET search_path TO auth, public, extensions;

-- Ensure the change takes effect in the current session
SET search_path TO auth, public, extensions;