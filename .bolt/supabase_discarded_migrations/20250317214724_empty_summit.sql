/*
  # Add avatar URL to profiles

  1. Changes
    - Add avatar_url column to profiles table
  
  2. Notes
    - Using safe column addition with IF NOT EXISTS check
*/

-- Add avatar_url column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url text;
  END IF;
END $$;