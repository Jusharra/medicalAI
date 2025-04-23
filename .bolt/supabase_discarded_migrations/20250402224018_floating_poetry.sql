/*
  # Add Member Rewards Table and Demo Data

  1. New Tables
    - `member_rewards`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references auth.users)
      - `name` (text)
      - `description` (text)
      - `value` (numeric)
      - `redeemed` (boolean)
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz)
      - `renewal_date` (timestamptz)
      - `reward_type` (text)
      - `terms_conditions` (text)
      - `image_url` (text)
      - `status` (text)

  2. Security
    - Enable RLS
    - Add policies for:
      - Admins to have full access
      - Members to access their own rewards
*/

-- Drop the table if it exists to start fresh
DROP TABLE IF EXISTS member_rewards;

-- Create the table from scratch
CREATE TABLE member_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  value numeric,
  redeemed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  renewal_date timestamptz,
  reward_type text NOT NULL,
  terms_conditions text,
  image_url text,
  status text DEFAULT 'available'
);

-- Enable RLS
ALTER TABLE member_rewards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins full access to rewards" ON member_rewards;
DROP POLICY IF EXISTS "Members access own rewards" ON member_rewards;

-- Create policies
CREATE POLICY "Admins full access to rewards"
  ON member_rewards
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "Members access own rewards"
  ON member_rewards
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = profile_id
  );

-- Create indexes
CREATE INDEX idx_member_rewards_profile_id ON member_rewards(profile_id);
CREATE INDEX idx_member_rewards_status ON member_rewards(status);
CREATE INDEX idx_member_rewards_expires_at ON member_rewards(expires_at);

-- Insert sample rewards for existing users
DO $$
DECLARE
  user_id uuid;
  current_date_val timestamptz := now();
  next_month_val timestamptz := now() + interval '1 month';
  next_year_val timestamptz := now() + interval '1 year';
  six_months_val timestamptz := now() + interval '6 months';
BEGIN
  -- For each user
  FOR user_id IN 
    SELECT id FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 10
  LOOP
    -- Essential Tier Rewards
    INSERT INTO member_rewards (
      profile_id, 
      name, 
      description, 
      value, 
      redeemed,
      expires_at, 
      renewal_date, 
      reward_type,
      terms_conditions,
      image_url,
      status
    ) VALUES
    (
      user_id,
      'Complimentary Wellness Consultation',
      'Enjoy a free 60-minute consultation with one of our wellness experts to create your personalized health plan.',
      299,
      false,
      next_month_val,
      next_year_val,
      'service',
      'Must be scheduled at least 48 hours in advance. Subject to availability.',
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
      'available'
    ),
    (
      user_id,
      'Annual Health Assessment',
      'Comprehensive health screening and personalized report with our medical team.',
      499,
      false,
      six_months_val,
      next_year_val,
      'service',
      'One assessment per membership year. Includes basic lab work and consultation.',
      'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80',
      'available'
    ),
    (
      user_id,
      '$200 Hotel Credit',
      'Enjoy a $200 credit at any of our partner luxury hotels worldwide.',
      200,
      false,
      next_year_val,
      next_year_val,
      'travel',
      'Credit must be used in a single stay. Blackout dates may apply. See full terms for details.',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      'available'
    ),
    (
      user_id,
      '20% Off All Services',
      'Receive 20% off all medical and wellness services for the duration of your membership.',
      0,
      false,
      next_year_val,
      next_year_val,
      'discount',
      'Cannot be combined with other offers. Excludes third-party services.',
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
      'available'
    );

    -- Executive Tier Rewards (random selection)
    IF random() > 0.5 THEN
      INSERT INTO member_rewards (
        profile_id, 
        name, 
        description, 
        value, 
        redeemed,
        expires_at, 
        renewal_date, 
        reward_type,
        terms_conditions,
        image_url,
        status
      ) VALUES
      (
        user_id,
        'Annual Wellness Retreat',
        'All-inclusive 3-day wellness retreat at a luxury destination.',
        2500,
        false,
        next_year_val,
        next_year_val,
        'travel',
        'Reservation required 60 days in advance. Accommodation and meals included. Transportation not included.',
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
        'available'
      ),
      (
        user_id,
        '$1,000 Hotel Vouchers',
        'Enjoy $1,000 in hotel vouchers at premium destinations worldwide.',
        1000,
        false,
        next_year_val,
        next_year_val,
        'travel',
        'Vouchers can be used at any partner hotel. Minimum 2-night stay required.',
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
        'available'
      ),
      (
        user_id,
        'VIP Event Access',
        'Exclusive access to VIP health and wellness events throughout the year.',
        0,
        false,
        next_year_val,
        next_year_val,
        'experience',
        'Registration required. Limited spots available on a first-come, first-served basis.',
        'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
        'available'
      );
    END IF;

    -- Elite Tier Rewards (random selection)
    IF random() > 0.7 THEN
      INSERT INTO member_rewards (
        profile_id, 
        name, 
        description, 
        value, 
        redeemed,
        expires_at, 
        renewal_date, 
        reward_type,
        terms_conditions,
        image_url,
        status
      ) VALUES
      (
        user_id,
        'Private Medical Transport',
        'Access to private medical transport services for emergency and non-emergency situations.',
        5000,
        false,
        next_year_val,
        next_year_val,
        'service',
        'Subject to availability. For medical purposes only. 24-hour notice required for non-emergency transport.',
        'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80',
        'available'
      ),
      (
        user_id,
        'Global Coverage',
        'Comprehensive healthcare coverage during international travel.',
        0,
        false,
        next_year_val,
        next_year_val,
        'service',
        'Coverage limited to emergency and urgent care services. Pre-existing conditions may be excluded.',
        'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&w=800&q=80',
        'available'
      ),
      (
        user_id,
        'Exclusive Retreat',
        'Invitation to our annual exclusive health retreat at a luxury destination.',
        7500,
        false,
        next_year_val,
        next_year_val,
        'travel',
        'RSVP required 90 days in advance. Includes accommodation and meals. Transportation not included.',
        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
        'available'
      );
    END IF;

    -- Add some redeemed rewards
    IF random() > 0.5 THEN
      INSERT INTO member_rewards (
        profile_id, 
        name, 
        description, 
        value, 
        redeemed,
        expires_at, 
        renewal_date, 
        reward_type,
        terms_conditions,
        image_url,
        status
      ) VALUES
      (
        user_id,
        'Spa Treatment Package',
        'Luxury spa treatment package at one of our partner facilities.',
        350,
        true,
        current_date_val - interval '1 month',
        next_year_val,
        'service',
        'Appointment required. Gratuity not included.',
        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
        'used'
      );
    END IF;

    -- Add some expired rewards
    IF random() > 0.7 THEN
      INSERT INTO member_rewards (
        profile_id, 
        name, 
        description, 
        value, 
        redeemed,
        expires_at, 
        renewal_date, 
        reward_type,
        terms_conditions,
        image_url,
        status
      ) VALUES
      (
        user_id,
        'Seasonal Promotion',
        'Special seasonal health package with our partners.',
        199,
        false,
        current_date_val - interval '1 month',
        NULL,
        'promotion',
        'Limited time offer. Cannot be combined with other promotions.',
        'https://images.unsplash.com/photo-1556742031-c6961e8560b0?auto=format&fit=crop&w=800&q=80',
        'expired'
      );
    END IF;
  END LOOP;
END $$;