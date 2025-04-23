/*
  # Add RLS Policies to Subscriptions Table
  
  1. Purpose
    - Enable RLS on subscriptions table
    - Add policies for authenticated users
    
  2. Changes
    - Drop existing policies to avoid conflicts
    - Create new RLS policy for all operations
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
    DROP POLICY IF EXISTS "subscriptions_insert_own" ON subscriptions;
    DROP POLICY IF EXISTS "subscriptions_update_own" ON subscriptions;
    DROP POLICY IF EXISTS "Authenticated users can manage their subscriptions" ON subscriptions;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create unified policy for all operations
CREATE POLICY "Authenticated users can manage their subscriptions"
  ON subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);