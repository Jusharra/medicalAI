/*
  # Set Super Admin Flag
  
  1. Purpose
    - Set is_super_admin flag for specific user
    - Update profile record
    
  2. Changes
    - Add is_super_admin column if not exists
    - Set flag for target user
*/

-- Add is_super_admin column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN is_super_admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Set super admin flag for specific user
UPDATE profiles 
SET 
  is_super_admin = true,
  updated_at = now()
WHERE id = 'd6f39b4e-edaf-4815-98d7-ff1e4416319b';

-- Verify the update
DO $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT is_super_admin INTO is_admin
  FROM profiles
  WHERE id = 'd6f39b4e-edaf-4815-98d7-ff1e4416319b';

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Failed to set super admin flag';
  END IF;
END $$;