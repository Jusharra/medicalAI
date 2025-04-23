/*
  # Add full_name column to profiles table

  1. Changes
    - Add full_name column to profiles table
    - No other changes to maintain data integrity

  2. Security
    - No changes to RLS policies needed
    - Existing policies will cover the new column
*/

-- Add full_name column to profiles table if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS full_name text;