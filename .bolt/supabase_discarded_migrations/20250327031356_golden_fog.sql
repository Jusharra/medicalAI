/*
  # Create Lead Interactions Table
  
  1. Purpose
    - Store user interactions with the system
    - Track assessment completions and engagement
    - Enable personalized follow-up
    
  2. Security
    - Enable RLS
    - Add policies for user access
*/

-- Create lead_interactions table
CREATE TABLE IF NOT EXISTS lead_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id text NOT NULL,
  interaction_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  ai_response text,
  engagement_score integer,
  sentiment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "lead_interactions_select_own"
  ON lead_interactions
  FOR SELECT
  TO authenticated
  USING (lead_id = auth.email());

CREATE POLICY "lead_interactions_insert_own"
  ON lead_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (lead_id = auth.email());

-- Create indexes
CREATE INDEX idx_lead_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX idx_lead_interactions_type ON lead_interactions(interaction_type);
CREATE INDEX idx_lead_interactions_created ON lead_interactions(created_at);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION handle_lead_interactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER update_lead_interactions_updated_at
  BEFORE UPDATE ON lead_interactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_lead_interactions_updated_at();

-- Insert sample data
INSERT INTO lead_interactions (
  lead_id,
  interaction_type,
  content,
  ai_response,
  engagement_score,
  sentiment
) VALUES (
  'test@example.com',
  'assessment',
  '{
    "symptoms": ["Fatigue", "Stress", "Sleep Issues"],
    "lifestyle": ["High Stress", "Poor Sleep", "Sedentary Work"],
    "goals": ["Improve Overall Health", "Better Sleep Quality", "Stress Management"]
  }',
  'Based on your assessment, we recommend our Premium Care membership for comprehensive health monitoring and stress management support.',
  85,
  'concerned'
);