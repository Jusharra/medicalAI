/*
  # Add Health Assessments Table
  
  1. Purpose
    - Store user health assessments
    - Track health metrics over time
    - Enable trend analysis
    
  2. Security
    - Enable RLS
    - Add policies for user access
*/

-- Create health_assessments table
CREATE TABLE IF NOT EXISTS health_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  symptoms text[] DEFAULT '{}',
  lifestyle text[] DEFAULT '{}',
  goals text[] DEFAULT '{}',
  physical_health jsonb NOT NULL DEFAULT '{
    "exerciseFrequency": null,
    "sleepQuality": null,
    "energyLevel": null
  }',
  mental_health jsonb NOT NULL DEFAULT '{
    "stressLevel": null,
    "moodStability": null,
    "anxietyLevel": null
  }',
  vital_signs jsonb NOT NULL DEFAULT '{
    "weight": null,
    "height": null,
    "bloodPressure": null,
    "restingHeartRate": null
  }',
  engagement_score integer,
  ai_recommendations text,
  treatment_plan jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE health_assessments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own assessments"
  ON health_assessments
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can create own assessments"
  ON health_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Create indexes
CREATE INDEX idx_health_assessments_profile ON health_assessments(profile_id);
CREATE INDEX idx_health_assessments_created ON health_assessments(created_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION handle_health_assessment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_health_assessments_updated_at
  BEFORE UPDATE ON health_assessments
  FOR EACH ROW
  EXECUTE FUNCTION handle_health_assessment_updated_at();

-- Create function to analyze trends
CREATE OR REPLACE FUNCTION analyze_health_trends(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH recent_assessments AS (
    SELECT 
      symptoms,
      physical_health->>'exerciseFrequency' as exercise_frequency,
      mental_health->>'stressLevel' as stress_level,
      created_at
    FROM health_assessments
    WHERE profile_id = user_id
    ORDER BY created_at DESC
    LIMIT 5
  ),
  symptom_trends AS (
    SELECT 
      unnest(symptoms) as symptom,
      count(*) as frequency,
      max(created_at) as last_reported
    FROM recent_assessments
    GROUP BY symptom
  )
  SELECT jsonb_build_object(
    'symptoms', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'type', symptom,
          'frequency', frequency,
          'lastReported', last_reported
        )
      )
      FROM symptom_trends
    ),
    'exercise', (
      SELECT jsonb_build_object(
        'current', exercise_frequency,
        'trend', CASE 
          WHEN exercise_frequency > lag(exercise_frequency) OVER (ORDER BY created_at)
          THEN 'increasing'
          WHEN exercise_frequency < lag(exercise_frequency) OVER (ORDER BY created_at)
          THEN 'decreasing'
          ELSE 'stable'
        END
      )
      FROM recent_assessments
      WHERE exercise_frequency IS NOT NULL
      LIMIT 1
    ),
    'stress', (
      SELECT jsonb_build_object(
        'current', stress_level,
        'trend', CASE 
          WHEN stress_level > lag(stress_level) OVER (ORDER BY created_at)
          THEN 'increasing'
          WHEN stress_level < lag(stress_level) OVER (ORDER BY created_at)
          THEN 'decreasing'
          ELSE 'stable'
        END
      )
      FROM recent_assessments
      WHERE stress_level IS NOT NULL
      LIMIT 1
    )
  ) INTO result;

  RETURN result;
END;
$$;