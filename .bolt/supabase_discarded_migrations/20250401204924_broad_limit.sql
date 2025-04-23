/*
  # Fix Profiles Schema

  1. Changes
    - Add full_name column to profiles table if it doesn't exist
    - Update existing trigger to handle full_name properly
    - Add missing indexes

  2. Security
    - Maintain existing RLS policies
*/

-- Add full_name column if it doesn't exist
DO $$ 
BEGIN
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name text;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create updated function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (
    id,
    email,
    full_name,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    now()
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create index for full_name if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);

-- Update existing profiles that have null full_name
UPDATE profiles 
SET full_name = split_part(email, '@', 1)
WHERE full_name IS NULL;