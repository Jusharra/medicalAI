/*
  # Add Health Assessments for All Users

  1. Changes
    - Add health assessment records for all users who don't have one
    - Use realistic data with varied timestamps
    - Ensure proper foreign key relationships

  2. Security
    - No changes to RLS policies needed
*/

-- Insert health assessments for users who don't have one
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
  profiles.id as profile_id,
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
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM health_assessments 
  WHERE health_assessments.profile_id = profiles.id
);

-- Add vital signs for users who don't have any
INSERT INTO vital_signs (
  profile_id,
  temperature,
  heart_rate,
  blood_pressure,
  measured_at
)
SELECT 
  profiles.id as profile_id,
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
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM vital_signs 
  WHERE vital_signs.profile_id = profiles.id
);

-- Add health metrics for users who don't have any
INSERT INTO health_metrics (
  profile_id,
  metric_type,
  value,
  unit,
  measured_at,
  notes
)
SELECT
  profiles.id as profile_id,
  'weight' as metric_type,
  70 + (random() * 20) as value,
  'kg' as unit,
  now() - (random() * interval '30 days') as measured_at,
  'Regular checkup' as notes
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM health_metrics 
  WHERE health_metrics.profile_id = profiles.id
);