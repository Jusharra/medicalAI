/*
  # Fix Users Table Schema and Add Full Name Column

  1. Changes
    - Add full_name column to users table if it doesn't exist
    - Copy full_name data from profiles to users table
    - Create index for better query performance

  2. Security
    - No changes to RLS policies needed
*/

-- Add full_name column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_name text;

-- Create index for full_name column
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);

-- Copy full_name data from profiles to users
UPDATE users
SET full_name = profiles.full_name
FROM profiles
WHERE users.id = profiles.id
AND users.full_name IS NULL
AND profiles.full_name IS NOT NULL;

-- Update users with empty full_name to use email as fallback
UPDATE users
SET full_name = SPLIT_PART(email, '@', 1)
WHERE full_name IS NULL OR full_name = '';