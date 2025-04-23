/*
  # Fix Promotion Claims RLS Policies

  1. Changes
    - Drop and recreate RLS policies for promotion_claims
    - Simplify policy conditions to fix permission issues
    - Ensure proper access for users to claim promotions

  2. Security
    - Enable RLS
    - Add policies for:
      - SELECT: Users can view their own claims
      - INSERT: Users can claim active promotions
      - UPDATE: Partners can update claims for their promotions
*/

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
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = promotion_claims.promotion_id
      AND promotions.partner_id = auth.uid()
    ) OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "promotion_claims_insert_own"
  ON promotion_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to claim promotions for themselves
    auth.uid() = profile_id AND
    -- Verify the promotion is active and not expired
    EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = promotion_id
      AND promotions.status = 'active'
      AND promotions.expires_at > now()
    )
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
      AND (
        promotions.partner_id = auth.uid() OR
        (auth.jwt() ->> 'role')::text = 'admin'
      )
    )
  )
  WITH CHECK (
    -- Partners can update claims for their promotions
    EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = promotion_claims.promotion_id
      AND (
        promotions.partner_id = auth.uid() OR
        (auth.jwt() ->> 'role')::text = 'admin'
      )
    )
  );