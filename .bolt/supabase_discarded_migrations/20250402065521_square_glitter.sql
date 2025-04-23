-- Enable RLS
ALTER TABLE care_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "care_team_members_select" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_insert" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_update" ON care_team_members;
DROP POLICY IF EXISTS "care_team_members_delete" ON care_team_members;
DROP POLICY IF EXISTS "partners_select" ON partners;

-- Create maximally simplified policies for care_team_members
CREATE POLICY "care_team_members_select"
  ON care_team_members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "care_team_members_insert"
  ON care_team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
  );

CREATE POLICY "care_team_members_update"
  ON care_team_members
  FOR UPDATE
  TO authenticated
  USING (
    profile_id = auth.uid()
  )
  WITH CHECK (
    profile_id = auth.uid()
  );

CREATE POLICY "care_team_members_delete"
  ON care_team_members
  FOR DELETE
  TO authenticated
  USING (
    profile_id = auth.uid()
  );

-- Create maximally simplified policy for partners
CREATE POLICY "partners_select"
  ON partners
  FOR SELECT
  TO authenticated
  USING (true);

-- Drop existing foreign key if it exists
ALTER TABLE care_team_members
DROP CONSTRAINT IF EXISTS care_team_members_partner_id_fkey;

-- Clean up any orphaned records
DELETE FROM care_team_members
WHERE partner_id IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM partners WHERE partners.id = care_team_members.partner_id
);

-- Add the foreign key constraint
ALTER TABLE care_team_members
ADD CONSTRAINT care_team_members_partner_id_fkey
FOREIGN KEY (partner_id)
REFERENCES partners(id)
ON DELETE CASCADE;

-- Drop existing indexes first to avoid conflicts
DROP INDEX IF EXISTS idx_care_team_members_profile_id;
DROP INDEX IF EXISTS idx_care_team_members_partner_id;
DROP INDEX IF EXISTS idx_care_team_members_composite;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_care_team_members_profile_id ON care_team_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_partner_id ON care_team_members(partner_id);
CREATE INDEX IF NOT EXISTS idx_care_team_members_composite ON care_team_members(profile_id, partner_id);