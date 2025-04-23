/*
  # Update promotion_claims RLS policies

  1. Changes
    - Drop existing RLS policies for promotion_claims table
    - Add new comprehensive RLS policies for promotion_claims:
      - Allow users to insert their own claims
      - Allow users to view their own claims
      - Allow partners to view claims for their promotions
      - Allow admins full access
    
  2. Security
    - Enforce user can only claim promotions that:
      - Are active
      - Haven't expired
      - Haven't reached redemption limit
      - Haven't been claimed by the user before
    - Enable RLS on promotion_claims table
*/

-- Drop existing policies
DROP POLICY IF EXISTS "promotion_claims_insert_own" ON public.promotion_claims;
DROP POLICY IF EXISTS "promotion_claims_read_own" ON public.promotion_claims;
DROP POLICY IF EXISTS "promotion_claims_update_partner" ON public.promotion_claims;

-- Create new policies
CREATE POLICY "Users can insert their own claims"
ON public.promotion_claims
FOR INSERT TO authenticated
WITH CHECK (
  -- User can only create claims for themselves
  auth.uid() = profile_id 
  -- Promotion must exist and be active
  AND EXISTS (
    SELECT 1 
    FROM promotions p 
    WHERE p.id = promotion_id 
    AND p.status = 'active' 
    AND p.expires_at > now()
    -- Check redemption limit if set
    AND (
      p.redemption_limit = 0 
      OR (
        SELECT COUNT(*) 
        FROM promotion_claims pc 
        WHERE pc.promotion_id = p.id
      ) < p.redemption_limit
    )
  )
  -- User hasn't claimed this promotion before
  AND NOT EXISTS (
    SELECT 1 
    FROM promotion_claims pc 
    WHERE pc.profile_id = auth.uid() 
    AND pc.promotion_id = promotion_id
  )
);

CREATE POLICY "Users can view their own claims"
ON public.promotion_claims
FOR SELECT TO authenticated
USING (
  auth.uid() = profile_id
  OR 
  -- Partners can view claims for their promotions
  EXISTS (
    SELECT 1 
    FROM promotions p 
    WHERE p.id = promotion_id 
    AND p.partner_id = auth.uid()
  )
  OR
  -- Admins can view all claims
  EXISTS (
    SELECT 1 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

CREATE POLICY "Partners can update claims for their promotions"
ON public.promotion_claims
FOR UPDATE TO authenticated
USING (
  -- Partners can update claims for their promotions
  EXISTS (
    SELECT 1 
    FROM promotions p 
    WHERE p.id = promotion_id 
    AND p.partner_id = auth.uid()
  )
  OR
  -- Admins can update all claims
  EXISTS (
    SELECT 1 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
)
WITH CHECK (
  -- Partners can update claims for their promotions
  EXISTS (
    SELECT 1 
    FROM promotions p 
    WHERE p.id = promotion_id 
    AND p.partner_id = auth.uid()
  )
  OR
  -- Admins can update all claims
  EXISTS (
    SELECT 1 
    FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);