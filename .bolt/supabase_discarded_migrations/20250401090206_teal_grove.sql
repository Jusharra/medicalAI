/*
  # Fix Notes Table RLS Policies

  1. Changes
    - Add profile_id column to notes table
    - Enable RLS on notes table
    - Add policies for CRUD operations
    - Add foreign key constraint to profiles table

  2. Security
    - Enable RLS
    - Add policies for authenticated users to:
      - Insert their own notes
      - Read their own notes
      - Update their own notes
      - Delete their own notes
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "notes_insert_own" ON notes;
    DROP POLICY IF EXISTS "notes_select_own" ON notes;
    DROP POLICY IF EXISTS "notes_update_own" ON notes;
    DROP POLICY IF EXISTS "notes_delete_own" ON notes;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Add profile_id column if it doesn't exist
DO $$ 
BEGIN
    ALTER TABLE notes ADD COLUMN profile_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "notes_insert_own"
  ON notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "notes_select_own"
  ON notes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "notes_update_own"
  ON notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "notes_delete_own"
  ON notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_notes_profile_id ON notes(profile_id);