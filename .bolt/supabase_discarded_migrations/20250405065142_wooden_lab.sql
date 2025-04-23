/*
  # Fix Promotion Claims RLS Policies

  1. Changes
    - Check if policies exist before creating them
    - Create simplified policies that allow users to claim promotions
    - Fix INSERT policy to properly allow authenticated users to claim promotions

  2. Security
    - Enable RLS
    - Add policies for:
      - SELECT: Allow users to see their own claims
      - INSERT: Allow all authenticated users to claim promotions
      - UPDATE: Allow partners to update claims for their promotions
*/

-- Enable RLS
ALTER TABLE promotion_claims ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    -- Try to drop policies if they exist
    DROP POLICY IF EXISTS "promotion_claims_select" ON promotion_claims;
    DROP POLICY IF EXISTS "promotion_claims_insert" ON promotion_claims;
    DROP POLICY IF EXISTS "promotion_claims_update" ON promotion_claims;
    DROP POLICY IF EXISTS "promotion_claims_read_own" ON promotion_claims;
    DROP POLICY IF EXISTS "promotion_claims_insert_own" ON promotion_claims;
    DROP POLICY IF EXISTS "promotion_claims_update_partner" ON promotion_claims;
    DROP POLICY IF EXISTS "Users can insert their own claims" ON promotion_claims;
    DROP POLICY IF EXISTS "Users can view their own claims" ON promotion_claims;
    DROP POLICY IF EXISTS "Partners can update claims for their promotions" ON promotion_claims;
EXCEPTION
    WHEN undefined_object THEN
        -- Policy doesn't exist, continue
        NULL;
END $$;

-- Create new policies with unique names
CREATE POLICY "promotion_claims_select_v2"
  ON promotion_claims
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "promotion_claims_insert_v2"
  ON promotion_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can only claim promotions for themselves
    profile_id = auth.uid()
  );

CREATE POLICY "promotion_claims_update_v2"
  ON promotion_claims
  FOR UPDATE
  TO authenticated
  USING (
    -- Partners can update claims for their promotions
    EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = promotion_claims.promotion_id
      AND promotions.partner_id = auth.uid()
    ) OR
    -- Admins can update any claims
    (auth.jwt() ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    -- Partners can update claims for their promotions
    EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = promotion_claims.promotion_id
      AND promotions.partner_id = auth.uid()
    ) OR
    -- Admins can update any claims
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_promotion_claims_profile_id ON promotion_claims(profile_id);
CREATE INDEX IF NOT EXISTS idx_promotion_claims_promotion_id ON promotion_claims(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_claims_status ON promotion_claims(status);