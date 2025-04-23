/*
  # Fix Promotion Claims RLS Policies

  1. Changes
    - Drop ALL existing policies using a safe approach
    - Create new simplified policies with unique names
    - Fix the INSERT policy to allow users to claim promotions

  2. Security
    - Enable RLS
    - Add policies for:
      - SELECT: Allow all authenticated users to view claims
      - INSERT: Allow users to claim promotions for themselves
      - UPDATE: Allow partners to update claims for their promotions
*/

-- Enable RLS
ALTER TABLE promotion_claims ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies using a safe approach
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'promotion_claims' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.promotion_claims', pol.policyname);
    END LOOP;
END $$;

-- Create new simplified policies with unique names
CREATE POLICY "promotion_claims_policy_select"
  ON promotion_claims
  FOR SELECT
  TO authenticated
  USING (true);

-- This is the key policy that needs to be fixed
-- Allow users to insert claims for themselves without additional restrictions
CREATE POLICY "promotion_claims_policy_insert"
  ON promotion_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can only claim promotions for themselves
    profile_id = auth.uid()
  );

CREATE POLICY "promotion_claims_policy_update"
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