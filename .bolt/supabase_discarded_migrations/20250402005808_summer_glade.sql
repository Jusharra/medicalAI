/*
  # Add avatar_url column to profiles table

  1. Changes
    - Add avatar_url column to profiles table
    - Add index for better query performance

  2. Security
    - No changes to RLS policies needed as existing policies cover all columns
*/

-- Add avatar_url column if it doesn't exist
DO $$ 
BEGIN
    ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS avatar_url text;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Create index for avatar_url column
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON profiles(avatar_url);