/*
  # Fix Memberships RLS Policies
  
  1. Purpose
    - Add missing RLS policies for memberships table
    - Enable proper access control for membership creation
    
  2. Changes
    - Add INSERT policy for memberships
    - Update existing policies
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own membership" ON memberships;
DROP POLICY IF EXISTS "Users can update own membership" ON memberships;

-- Create new policies
CREATE POLICY "memberships_select_own"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "memberships_insert_own"
  ON memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "memberships_update_own"
  ON memberships
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());