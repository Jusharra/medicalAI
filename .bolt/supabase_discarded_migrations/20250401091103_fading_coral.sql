/*
  # Add care team members table

  1. New Tables
    - `care_team_members`
      - `id` (uuid, primary key)
      - `partner_id` (uuid, references partners)
      - `is_primary` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `care_team_members` table
    - Add policies for authenticated users
*/

-- Create care_team_members table
CREATE TABLE IF NOT EXISTS care_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE care_team_members ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "care_team_members_select"
  ON care_team_members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "care_team_members_insert"
  ON care_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "care_team_members_update"
  ON care_team_members
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "care_team_members_delete"
  ON care_team_members
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_care_team_members_partner ON care_team_members(partner_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_primary ON care_team_members(is_primary);