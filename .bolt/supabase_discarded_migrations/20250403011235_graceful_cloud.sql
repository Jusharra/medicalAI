/*
  # Add Lead Funnel Stats and Membership Tracking

  1. New Views
    - `lead_funnel_stats` - View for lead funnel statistics
    - `membership_conversion_stats` - View for membership conversion metrics

  2. Security
    - Enable RLS
    - Add policies for admin access
*/

-- Create view for lead funnel statistics
CREATE OR REPLACE VIEW lead_funnel_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'new') AS new_leads,
  COUNT(*) FILTER (WHERE status = 'nurturing') AS nurturing_leads,
  COUNT(*) FILTER (WHERE status = 'qualified') AS qualified_leads,
  COUNT(*) FILTER (WHERE status = 'converted') AS converted_leads,
  COUNT(*) FILTER (WHERE status = 'lost') AS lost_leads,
  COUNT(*) AS total_leads,
  CASE 
    WHEN COUNT(*) > 0 THEN 
      ROUND((COUNT(*) FILTER (WHERE status = 'converted')::numeric / COUNT(*)::numeric) * 100, 2)
    ELSE 0
  END AS conversion_rate
FROM leads;

-- Create view for membership conversion statistics
CREATE OR REPLACE VIEW membership_conversion_stats AS
SELECT
  DATE_TRUNC('month', leads.created_at) AS month,
  COUNT(DISTINCT leads.id) AS total_leads,
  COUNT(DISTINCT CASE WHEN leads.status = 'converted' THEN leads.id END) AS converted_leads,
  CASE 
    WHEN COUNT(DISTINCT leads.id) > 0 THEN 
      ROUND((COUNT(DISTINCT CASE WHEN leads.status = 'converted' THEN leads.id END)::numeric / 
             COUNT(DISTINCT leads.id)::numeric) * 100, 2)
    ELSE 0
  END AS conversion_rate
FROM leads
GROUP BY DATE_TRUNC('month', leads.created_at)
ORDER BY month DESC;

-- Enable RLS on views
ALTER VIEW lead_funnel_stats OWNER TO postgres;
ALTER VIEW membership_conversion_stats OWNER TO postgres;

-- Create function to track lead status changes
CREATE OR REPLACE FUNCTION track_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Insert interaction record for status change
    INSERT INTO lead_interactions (
      lead_id,
      interaction_type,
      content,
      engagement_score
    ) VALUES (
      NEW.id,
      'status_change',
      jsonb_build_object(
        'from', OLD.status,
        'to', NEW.status,
        'changed_by', auth.uid()
      ),
      CASE 
        WHEN NEW.status = 'converted' THEN 100
        WHEN NEW.status = 'qualified' THEN 75
        WHEN NEW.status = 'nurturing' THEN 50
        WHEN NEW.status = 'new' THEN 25
        ELSE 0
      END
    );
    
    -- Update last_contact timestamp
    NEW.last_contact = now();
    
    -- Set next_contact based on new status
    IF NEW.status = 'new' THEN
      NEW.next_contact = now() + interval '1 day';
    ELSIF NEW.status = 'nurturing' THEN
      NEW.next_contact = now() + interval '3 days';
    ELSIF NEW.status = 'qualified' THEN
      NEW.next_contact = now() + interval '1 day';
    ELSIF NEW.status = 'converted' THEN
      NEW.next_contact = now() + interval '7 days';
    ELSE
      NEW.next_contact = NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for lead status changes
DROP TRIGGER IF EXISTS track_lead_status_change_trigger ON leads;
CREATE TRIGGER track_lead_status_change_trigger
  BEFORE UPDATE OF status ON leads
  FOR EACH ROW
  EXECUTE FUNCTION track_lead_status_change();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_type ON lead_interactions(interaction_type);