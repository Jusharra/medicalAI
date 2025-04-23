-- Create service_preferences table
CREATE TABLE IF NOT EXISTS service_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{
    "preferred_categories": [],
    "preferred_days": [],
    "preferred_times": [],
    "preferred_locations": [],
    "max_travel_distance": 25,
    "special_requirements": [],
    "communication_preferences": {
      "pre_appointment_reminder": true,
      "post_appointment_followup": true,
      "preferred_contact_method": "email"
    },
    "health_focus_areas": []
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id)
);

-- Enable RLS
ALTER TABLE service_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own preferences"
  ON service_preferences
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON service_preferences
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON service_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Create indexes
CREATE INDEX idx_service_preferences_profile_id ON service_preferences(profile_id);

-- Create trigger for updated_at
CREATE TRIGGER update_service_preferences_updated_at
  BEFORE UPDATE ON service_preferences
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();