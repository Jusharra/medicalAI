-- Create function to initialize user preferences
CREATE OR REPLACE FUNCTION initialize_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (
    user_id,
    email_notifications,
    sms_notifications,
    marketing_emails
  ) VALUES (
    NEW.id,
    true,  -- Default email notifications to true
    true,  -- Default SMS notifications to true
    false  -- Default marketing emails to false
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create preferences for new users
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_preferences();

-- Create preferences for existing users
INSERT INTO user_preferences (user_id, email_notifications, sms_notifications, marketing_emails)
SELECT 
  id as user_id,
  true as email_notifications,
  true as sms_notifications,
  false as marketing_emails
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;