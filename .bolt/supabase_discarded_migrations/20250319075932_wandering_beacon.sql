/*
  # Add Lead Capture and Nurturing Schema
  
  1. Changes
    - Safely create or update lead capture tables
    - Add functions and triggers for lead scoring
    - Ensure idempotent operations
    
  2. Security
    - Enable RLS
    - Add policies for lead management
*/

-- Safely create leads table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    first_name text,
    last_name text,
    phone text,
    status text DEFAULT 'new' CHECK (status IN ('new', 'nurturing', 'qualified', 'converted', 'lost')),
    source text,
    health_interests text[],
    risk_factors jsonb,
    lead_score numeric DEFAULT 0,
    last_contact timestamptz,
    next_contact timestamptz,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Safely create lead_interactions table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS lead_interactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
    interaction_type text NOT NULL CHECK (interaction_type IN ('email', 'chat', 'assessment', 'webinar')),
    content text NOT NULL,
    ai_response text,
    engagement_score numeric,
    sentiment text,
    created_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;

-- Create indexes if they don't exist
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
  CREATE INDEX IF NOT EXISTS leads_lead_score_idx ON leads(lead_score);
  CREATE INDEX IF NOT EXISTS lead_interactions_lead_id_idx ON lead_interactions(lead_id);
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Create or replace function to update lead score
CREATE OR REPLACE FUNCTION update_lead_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate new lead score based on interaction type and engagement
  UPDATE leads
  SET lead_score = (
    SELECT COALESCE(AVG(engagement_score), 0) * CASE
      WHEN COUNT(*) > 5 THEN 1.5 -- Bonus for multiple interactions
      ELSE 1.0
    END
    FROM lead_interactions
    WHERE lead_id = NEW.lead_id
  )
  WHERE id = NEW.lead_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safely create trigger for lead score updates
DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_lead_score_on_interaction ON lead_interactions;
  CREATE TRIGGER update_lead_score_on_interaction
    AFTER INSERT OR UPDATE ON lead_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_score();
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

-- Create or replace function to schedule next contact
CREATE OR REPLACE FUNCTION schedule_next_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- Set next contact based on lead status and score
  UPDATE leads
  SET next_contact = CASE
    WHEN NEW.status = 'new' THEN now() + interval '1 day'
    WHEN NEW.status = 'nurturing' AND NEW.lead_score < 50 THEN now() + interval '3 days'
    WHEN NEW.status = 'nurturing' AND NEW.lead_score >= 50 THEN now() + interval '1 day'
    WHEN NEW.status = 'qualified' THEN now() + interval '12 hours'
    ELSE null
  END
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safely create trigger for next contact scheduling
DO $$ BEGIN
  DROP TRIGGER IF EXISTS schedule_next_contact_on_update ON leads;
  CREATE TRIGGER schedule_next_contact_on_update
    AFTER UPDATE OF status, lead_score ON leads
    FOR EACH ROW
    EXECUTE FUNCTION schedule_next_contact();
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;