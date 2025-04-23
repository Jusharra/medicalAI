/*
  # Add Payment Activation Trigger and Email Functions

  1. Purpose
    - Trigger password reset email after successful payment
    - Update member status to active
    - Handle email confirmation and password reset flow

  2. Changes
    - Add trigger for membership status changes
    - Add function to handle payment activation
    - Update member status tracking
*/

-- Create function to handle payment activation
CREATE OR REPLACE FUNCTION handle_payment_activation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if payment status changed to succeeded
  IF NEW.payment_status = 'succeeded' AND 
     (OLD.payment_status IS NULL OR OLD.payment_status != 'succeeded') THEN
    
    -- Update membership status to active
    UPDATE memberships
    SET status = 'active',
        updated_at = now()
    WHERE id = NEW.id;

    -- Trigger password reset email if needed
    INSERT INTO auth.users_email_resets (user_id, email)
    SELECT p.id, u.email
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.id = NEW.profile_id
    AND NOT EXISTS (
      SELECT 1 FROM auth.users_email_resets
      WHERE user_id = p.id
      AND created_at > now() - interval '24 hours'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment activation
DROP TRIGGER IF EXISTS on_payment_success ON memberships;
CREATE TRIGGER on_payment_success
  AFTER UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION handle_payment_activation();

-- Add index for faster payment status checks
CREATE INDEX IF NOT EXISTS idx_memberships_payment_status 
ON memberships(payment_status);