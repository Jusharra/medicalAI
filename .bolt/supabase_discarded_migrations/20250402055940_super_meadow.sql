/*
  # Fix Promotion Claims RLS Policies

  1. Changes
    - Drop and recreate RLS policies for promotion_claims table
    - Simplify policy conditions to avoid recursion
    - Fix INSERT policy to properly allow users to claim promotions

  2. Security
    - Enable RLS
    - Add policies for:
      - SELECT: Allow users to see their own claims
      - INSERT: Allow users to claim active promotions
      - UPDATE: Allow partners to update claims for their promotions
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
    auth.uid() = profile_id AND
    -- The promotion must exist, be active, and not expired
    EXISTS (
      SELECT 1 FROM promotions p
      WHERE p.id = promotion_id
      AND p.status = 'active'
      AND p.expires_at > now()
    )
  );

CREATE POLICY "promotion_claims_update_partner"
  ON promotion_claims
  FOR UPDATE
  TO authenticated
  USING (
    -- Partners can update claims for their promotions
    EXISTS (
      SELECT 1 FROM promotions p
      WHERE p.id = promotion_claims.promotion_id
      AND (
        p.partner_id = auth.uid() OR
        (auth.jwt() ->> 'role')::text = 'admin'
      )
    )
  )
  WITH CHECK (
    -- Partners can update claims for their promotions
    EXISTS (
      SELECT 1 FROM promotions p
      WHERE p.id = promotion_claims.promotion_id
      AND (
        p.partner_id = auth.uid() OR
        (auth.jwt() ->> 'role')::text = 'admin'
      )
    )
  );