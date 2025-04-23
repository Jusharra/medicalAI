/*
  # Fix Promotion Claims RLS Policies

  1. Changes
    - Simplify RLS policies for promotion_claims table
    - Allow authenticated users to claim promotions
    - Remove unnecessary checks that were causing policy violations
    - Keep partner and admin access controls

  2. Security
    - Enable RLS
    - Add policies for:
      - SELECT: Users can see their own claims, partners see claims for their promotions
      - INSERT: Users can claim promotions for themselves
      - UPDATE: Partners can update claims for their promotions
*/

-- Enable RLS
ALTER TABLE promotion_claims ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "promotion_claims_read_own" ON promotion_claims;
DROP POLICY IF EXISTS "promotion_claims_insert_own" ON promotion_claims;
DROP POLICY IF EXISTS "promotion_claims_update_partner" ON promotion_claims;

-- Create simplified policies
CREATE POLICY "promotion_claims_read_own"
  ON promotion_claims
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own claims
    profile_id = auth.uid() OR
    -- Partners can see claims for their promotions
    EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = promotion_claims.promotion_id
      AND promotions.partner_id = auth.uid()
    ) OR
    -- Admins can see all claims
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "promotion_claims_insert_own"
  ON promotion_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can only claim promotions for themselves
    profile_id = auth.uid()
  );

CREATE POLICY "promotion_claims_update_partner"
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promotion_claims_profile_id ON promotion_claims(profile_id);
CREATE INDEX IF NOT EXISTS idx_promotion_claims_promotion_id ON promotion_claims(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_claims_status ON promotion_claims(status);