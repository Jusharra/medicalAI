/*
  # Add Notes Table

  1. New Tables
    - `notes`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references auth.users)
      - `content` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to:
      - Read their own notes
      - Create their own notes
      - Update their own notes
      - Delete their own notes
*/

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "notes_select_own"
  ON notes
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "notes_insert_own"
  ON notes
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "notes_update_own"
  ON notes
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "notes_delete_own"
  ON notes
  FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- Create indexes
CREATE INDEX idx_notes_profile_id ON notes(profile_id);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();