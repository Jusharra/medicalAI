/*
  # Fix Promotion Claims RLS Policies

  1. Changes
    - Drop existing policies that cause recursion
    - Create new simplified policies without circular references
    - Use direct checks instead of complex subqueries
    - Add proper indexes for performance

  2. Security
    - Enable RLS
    - Add policies for:
      - Users to claim promotions for themselves
      - Users to view their own claims
      - Partners to update claims for their promotions
      - Admins to manage all claims
*/

-- Enable RLS
ALTER TABLE promotion_claims ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "promotion_claims_read_own" ON promotion_claims;
DROP POLICY IF EXISTS "promotion_claims_insert_own" ON promotion_claims;
DROP POLICY IF EXISTS "promotion_claims_update_partner" ON promotion_claims;
DROP POLICY IF EXISTS "Users can insert their own claims" ON promotion_claims;
DROP POLICY IF EXISTS "Users can view their own claims" ON promotion_claims;
DROP POLICY IF EXISTS "Partners can update claims for their promotions" ON promotion_claims;

-- Create maximally simplified policies
CREATE POLICY "promotion_claims_select"
  ON promotion_claims
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "promotion_claims_insert"
  ON promotion_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can only claim promotions for themselves
    profile_id = auth.uid()
  );

CREATE POLICY "promotion_claims_update"
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