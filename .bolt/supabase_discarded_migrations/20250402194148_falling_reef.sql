/*
  # Add Demo Data for Vital Signs

  1. Changes
    - Add sample vital signs data for users
    - Add realistic values and timestamps
    - Add appropriate indexes for performance

  2. Security
    - No changes to RLS policies needed
    - Using existing user IDs for data population
*/

-- Create vital signs for existing users
INSERT INTO vital_signs (profile_id, temperature, heart_rate, blood_pressure, measured_at, created_at)
WITH user_measurements AS (
  SELECT 
    users.id as profile_id,
    generate_series(1, 10) as series_num,
    now() - (random() * interval '90 days') as base_date
  FROM users
  WHERE users.role = 'member'
  LIMIT 5
)
SELECT
  profile_id,
  -- Normal body temperature range with slight variations
  36.5 + (random() * 1.5) as temperature,
  -- Normal heart rate range (60-100 bpm)
  60 + (random() * 40) as heart_rate,
  -- Normal blood pressure range (systolic/diastolic)
  format('%s/%s', 
    floor(110 + (random() * 30))::text, 
    floor(70 + (random() * 20))::text
  ) as blood_pressure,
  -- Measurements taken over time
  base_date + (series_num * interval '1 day') as measured_at,
  base_date + (series_num * interval '1 day') as created_at
FROM user_measurements;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vital_signs_profile_id ON vital_signs(profile_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_measured_at ON vital_signs(measured_at DESC);

-- Add sample health assessments if none exist
INSERT INTO health_assessments (profile_id, symptoms, history, goals, physical_health, mental_health, created_at)
SELECT 
  users.id as profile_id,
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
FROM users
WHERE users.role = 'member'
AND NOT EXISTS (
  SELECT 1 FROM health_assessments 
  WHERE health_assessments.profile_id = users.id
)
LIMIT 10;

-- Add sample health metrics if none exist
INSERT INTO health_metrics (profile_id, metric_type, value, unit, measured_at, notes)
WITH user_metrics AS (
  SELECT 
    users.id as profile_id,
    generate_series(1, 10) as series_num,
    now() - (random() * interval '90 days') as base_date
  FROM users
  WHERE users.role = 'member'
  AND NOT EXISTS (
    SELECT 1 FROM health_metrics 
    WHERE health_metrics.profile_id = users.id
  )
  LIMIT 5
)
SELECT
  profile_id,
  metric_type,
  CASE metric_type
    WHEN 'weight' THEN 70 + (random() * 20)
    WHEN 'blood_pressure_systolic' THEN 110 + (random() * 30)
    WHEN 'blood_pressure_diastolic' THEN 70 + (random() * 20)
    WHEN 'heart_rate' THEN 60 + (random() * 30)
    WHEN 'temperature' THEN 36.5 + (random() * 1.5)
    ELSE random() * 100
  END as value,
  CASE metric_type
    WHEN 'weight' THEN 'kg'
    WHEN 'blood_pressure_systolic' THEN 'mmHg'
    WHEN 'blood_pressure_diastolic' THEN 'mmHg'
    WHEN 'heart_rate' THEN 'bpm'
    WHEN 'temperature' THEN '°C'
    ELSE 'units'
  END as unit,
  base_date + (series_num * interval '1 day') as measured_at,
  CASE floor(random() * 3)::int
    WHEN 0 THEN 'Regular checkup'
    WHEN 1 THEN 'Post-exercise measurement'
    ELSE 'Morning reading'
  END as notes
FROM user_metrics
CROSS JOIN (
  VALUES 
    ('weight'),
    ('blood_pressure_systolic'),
    ('blood_pressure_diastolic'),
    ('heart_rate'),
    ('temperature')
) as metrics(metric_type);