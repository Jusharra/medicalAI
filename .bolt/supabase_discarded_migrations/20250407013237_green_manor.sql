/*
  # Add Health Assessments and Care Team Members for All Users

  1. Changes
    - Insert health assessments for ALL users
    - Create care team relationships for ALL users
    - Ensure every user has at least one appointment

  2. Security
    - No changes to RLS policies needed
    - Only adding data to existing tables
*/

-- Insert health assessments for ALL users who don't have one
INSERT INTO health_assessments (
  profile_id,
  symptoms,
  history,
  goals,
  physical_health,
  mental_health,
  created_at
)
SELECT 
  auth.users.id as profile_id,
  CASE floor(random() * 3)::int
    WHEN 0 THEN 'Occasional headaches, mild fatigue'
    WHEN 1 THEN 'Joint pain, difficulty sleeping'
    ELSE 'Seasonal allergies, stress'
  END as symptoms,
  CASE floor(random() * 3)::int
    WHEN 0 THEN 'No significant medical history'
    WHEN 1 THEN 'Family history of hypertension'
    ELSE 'Previous sports injuries'
  END as history,
  CASE floor(random() * 3)::int
    WHEN 0 THEN 'Improve fitness and energy levels'
    WHEN 1 THEN 'Better stress management and sleep quality'
    ELSE 'Weight management and healthy lifestyle'
  END as goals,
  CASE floor(random() * 3)::int
    WHEN 0 THEN 'Regular exercise 3x/week, good energy levels'
    WHEN 1 THEN 'Moderate activity, some fatigue'
    ELSE 'Sedentary lifestyle, needs improvement'
  END as physical_health,
  CASE floor(random() * 3)::int
    WHEN 0 THEN 'Well-managed stress, positive outlook'
    WHEN 1 THEN 'Occasional anxiety, generally stable'
    ELSE 'High stress levels, needs support'
  END as mental_health,
  now() - (random() * interval '90 days') as created_at
FROM auth.users
LEFT JOIN health_assessments ON health_assessments.profile_id = auth.users.id
WHERE health_assessments.id IS NULL;

-- Add care team members for ALL users who don't have any
INSERT INTO care_team_members (
  profile_id,
  partner_id,
  is_primary,
  created_at
)
SELECT
  auth.users.id as profile_id,
  partners.id as partner_id,
  true as is_primary,
  now() - (random() * interval '60 days') as created_at
FROM auth.users
CROSS JOIN (
  SELECT id FROM partners WHERE status = 'active' ORDER BY random() LIMIT 1
) partners
WHERE NOT EXISTS (
  SELECT 1 FROM care_team_members 
  WHERE care_team_members.profile_id = auth.users.id
  AND care_team_members.is_primary = true
);

-- Add pharmacy relationships for ALL users who don't have any
INSERT INTO care_team_members (
  profile_id,
  pharmacy_id,
  is_primary,
  created_at
)
SELECT
  auth.users.id as profile_id,
  pharmacies.id as pharmacy_id,
  false as is_primary,
  now() - (random() * interval '45 days') as created_at
FROM auth.users
CROSS JOIN (
  SELECT id FROM pharmacies ORDER BY random() LIMIT 1
) pharmacies
WHERE NOT EXISTS (
  SELECT 1 FROM care_team_members 
  WHERE care_team_members.profile_id = auth.users.id
  AND care_team_members.pharmacy_id IS NOT NULL
);

-- Add appointments for ALL users who don't have any
INSERT INTO appointments (
  profile_id,
  service_id,
  partner_id,
  scheduled_for,
  status,
  notes,
  created_at
)
SELECT
  auth.users.id as profile_id,
  services.id as service_id,
  partners.id as partner_id,
  now() + (random() * interval '30 days') as scheduled_for,
  CASE floor(random() * 3)::int
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'confirmed'
    ELSE 'completed'
  END as status,
  CASE floor(random() * 3)::int
    WHEN 0 THEN 'Initial consultation'
    WHEN 1 THEN 'Follow-up appointment'
    ELSE 'Annual wellness check'
  END as notes,
  now() - (random() * interval '15 days') as created_at
FROM auth.users
CROSS JOIN (
  SELECT id FROM services WHERE active = true ORDER BY random() LIMIT 1
) services
CROSS JOIN (
  SELECT id FROM partners WHERE status = 'active' ORDER BY random() LIMIT 1
) partners
WHERE NOT EXISTS (
  SELECT 1 FROM appointments 
  WHERE appointments.profile_id = auth.users.id
);

-- Add vital signs for ALL users who don't have any
INSERT INTO vital_signs (
  profile_id,
  temperature,
  heart_rate,
  blood_pressure,
  measured_at
)
SELECT 
  auth.users.id as profile_id,
  -- Normal body temperature with slight variations (36.5-37.5°C)
  36.5 + (random() * 1.0) as temperature,
  -- Normal heart rate range (60-100 bpm)
  60 + (random() * 40) as heart_rate,
  -- Normal blood pressure range (systolic/diastolic)
  format('%s/%s', 
    floor(110 + (random() * 30))::text, 
    floor(70 + (random() * 20))::text
  ) as blood_pressure,
  -- Measurements taken recently
  now() - (random() * interval '30 days') as measured_at
FROM auth.users
LEFT JOIN vital_signs ON vital_signs.profile_id = auth.users.id
WHERE vital_signs.id IS NULL;

-- Add health metrics for ALL users who don't have any
INSERT INTO health_metrics (
  profile_id,
  metric_type,
  value,
  unit,
  measured_at,
  notes
)
SELECT
  auth.users.id as profile_id,
  'weight' as metric_type,
  70 + (random() * 20) as value,
  'kg' as unit,
  now() - (random() * interval '30 days') as measured_at,
  'Regular checkup' as notes
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM health_metrics 
  WHERE health_metrics.profile_id = auth.users.id
);