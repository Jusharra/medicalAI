/*
  # Fix Demo Data for Partners and Care Team Members

  1. Changes
    - Add practice details to partners
    - Create sample care team relationships
    - Ensure proper foreign key relationships

  2. Security
    - No changes to RLS policies needed
*/

-- Add practice details to partners
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS practice_name text,
ADD COLUMN IF NOT EXISTS practice_address jsonb,
ADD COLUMN IF NOT EXISTS specialties text[],
ADD COLUMN IF NOT EXISTS profile_image text,
ADD COLUMN IF NOT EXISTS consultation_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_consultation boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS in_person_consultation boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 5.0;

-- Update partner details with realistic data
UPDATE partners SET
  practice_name = CASE name
    WHEN 'Dr. Sarah Chen' THEN 'Bay Area Wellness Center'
    WHEN 'Dr. Michael Rodriguez' THEN 'Rodriguez Family Practice'
    WHEN 'Dr. Emily Thompson' THEN 'Thompson Medical Group'
    WHEN 'Dr. James Wilson' THEN 'Wilson Internal Medicine'
    WHEN 'Dr. David Kim' THEN 'Kim Cardiology Associates'
    WHEN 'Dr. Lisa Patel' THEN 'Patel Integrative Medicine'
    ELSE name || ' Medical Practice'
  END,
  practice_address = jsonb_build_object(
    'street', '123 Medical Plaza',
    'city', CASE random() * 3
      WHEN 0 THEN 'San Francisco'
      WHEN 1 THEN 'Palo Alto'
      ELSE 'San Jose'
    END,
    'state', 'CA',
    'zip', '94105'
  ),
  specialties = CASE 
    WHEN name LIKE '%Chen%' THEN ARRAY['Internal Medicine', 'Preventive Care', 'Wellness']
    WHEN name LIKE '%Rodriguez%' THEN ARRAY['Family Medicine', 'Sports Medicine', 'Nutrition']
    WHEN name LIKE '%Thompson%' THEN ARRAY['Internal Medicine', 'Geriatrics', 'Chronic Care']
    WHEN name LIKE '%Wilson%' THEN ARRAY['Family Medicine', 'Pediatrics', 'Preventive Care']
    WHEN name LIKE '%Kim%' THEN ARRAY['Cardiology', 'Internal Medicine', 'Preventive Care']
    WHEN name LIKE '%Patel%' THEN ARRAY['Integrative Medicine', 'Nutrition', 'Wellness']
    ELSE ARRAY['General Medicine', 'Primary Care']
  END,
  consultation_fee = floor(random() * 300 + 200),
  rating = 4 + random(),
  profile_image = CASE name
    WHEN 'Dr. Sarah Chen' THEN 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80'
    WHEN 'Dr. Michael Rodriguez' THEN 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=300&q=80'
    WHEN 'Dr. Emily Thompson' THEN 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=300&q=80'
    WHEN 'Dr. James Wilson' THEN 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=300&q=80'
    WHEN 'Dr. David Kim' THEN 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80'
    WHEN 'Dr. Lisa Patel' THEN 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=300&q=80'
    ELSE NULL
  END;

-- Create sample care team relationships
DO $$
DECLARE
  user_id uuid;
  partner_id uuid;
BEGIN
  -- Get first few users
  FOR user_id IN 
    SELECT id FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 5
  LOOP
    -- Assign 2-3 random partners to each user
    FOR partner_id IN 
      SELECT id FROM partners 
      WHERE status = 'active' 
      ORDER BY random() 
      LIMIT floor(random() * 2 + 2)::int
    LOOP
      -- Insert care team relationship
      INSERT INTO care_team_members (
        profile_id,
        partner_id,
        is_primary,
        created_at
      )
      VALUES (
        user_id,
        partner_id,
        CASE WHEN random() < 0.3 THEN true ELSE false END,
        now() - (random() * interval '90 days')
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;