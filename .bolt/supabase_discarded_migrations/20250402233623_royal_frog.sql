/*
  # Add Purchases Table and Demo Data

  1. New Tables
    - `purchases`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `product_name` (text)
      - `amount` (numeric)
      - `purchased_at` (timestamp)
      - `payment_method` (text)
      - `payment_status` (text)
      - `notes` (text)

  2. Security
    - Enable RLS
    - Add policies for:
      - Members to access own purchases
      - Admins to access all purchases
*/

-- Create purchases table if it doesn't exist
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  product_name text,
  amount numeric,
  purchased_at timestamptz DEFAULT now(),
  payment_method text DEFAULT 'Credit Card',
  payment_status text DEFAULT 'completed',
  notes text
);

-- Enable RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Members access own purchases" ON purchases;
DROP POLICY IF EXISTS "Admins full access to purchases" ON purchases;

-- Create policies
CREATE POLICY "Members access own purchases"
  ON purchases
  FOR ALL
  TO authenticated
  USING (
    profile_id = auth.uid()
  );

CREATE POLICY "Admins full access to purchases"
  ON purchases
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_purchases_profile_id ON purchases(profile_id);
CREATE INDEX IF NOT EXISTS idx_purchases_purchased_at ON purchases(purchased_at DESC);

-- Insert sample purchase data for existing confirmed appointments
INSERT INTO purchases (
  profile_id,
  product_name,
  amount,
  purchased_at
)
SELECT
  a.profile_id,
  s.name,
  s.price,
  a.created_at
FROM
  appointments a
JOIN
  services s ON a.service_id = s.id
WHERE
  a.status = 'confirmed';

-- Insert additional sample purchase data
INSERT INTO purchases (
  profile_id,
  product_name,
  amount,
  purchased_at
)
SELECT
  id as profile_id,
  CASE floor(random() * 5)::int
    WHEN 0 THEN 'Premium Membership'
    WHEN 1 THEN 'Health Assessment Package'
    WHEN 2 THEN 'Wellness Consultation'
    WHEN 3 THEN 'Nutrition Plan'
    ELSE 'Fitness Program'
  END as product_name,
  (random() * 500 + 100)::numeric as amount,
  now() - (random() * interval '90 days') as purchased_at
FROM
  profiles
WHERE
  id IN (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 10)
LIMIT 20;