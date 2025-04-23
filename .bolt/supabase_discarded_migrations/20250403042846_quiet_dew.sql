/*
  # Create Logs & Audit Trail System

  1. New Tables
    - `logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `action` (text)
      - `table_name` (text)
      - `record_id` (uuid)
      - `timestamp` (timestamptz)
      - `metadata` (jsonb)

  2. Security
    - Enable RLS
    - Add policies for admins to access logs
*/

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text,
  table_name text,
  record_id uuid,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb
);

-- Enable RLS
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can access logs"
  ON logs
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'admin');

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_action ON logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_table_name ON logs(table_name);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);

-- Create functions to automatically log changes

-- Function to log inserts
CREATE OR REPLACE FUNCTION log_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO logs (
    user_id,
    action,
    table_name,
    record_id,
    metadata
  ) VALUES (
    auth.uid(),
    'create',
    TG_TABLE_NAME,
    NEW.id,
    jsonb_build_object(
      'new_data', row_to_json(NEW)::jsonb
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log updates
CREATE OR REPLACE FUNCTION log_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO logs (
    user_id,
    action,
    table_name,
    record_id,
    metadata
  ) VALUES (
    auth.uid(),
    'update',
    TG_TABLE_NAME,
    NEW.id,
    jsonb_build_object(
      'old_data', row_to_json(OLD)::jsonb,
      'new_data', row_to_json(NEW)::jsonb,
      'changed_fields', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(row_to_json(NEW)::jsonb)
        WHERE NOT (row_to_json(OLD)::jsonb ? key AND row_to_json(OLD)::jsonb->key = value)
      )
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log deletes
CREATE OR REPLACE FUNCTION log_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO logs (
    user_id,
    action,
    table_name,
    record_id,
    metadata
  ) VALUES (
    auth.uid(),
    'delete',
    TG_TABLE_NAME,
    OLD.id,
    jsonb_build_object(
      'old_data', row_to_json(OLD)::jsonb
    )
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for key tables

-- Users table
DROP TRIGGER IF EXISTS log_users_insert ON users;
CREATE TRIGGER log_users_insert
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_insert();

DROP TRIGGER IF EXISTS log_users_update ON users;
CREATE TRIGGER log_users_update
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_update();

DROP TRIGGER IF EXISTS log_users_delete ON users;
CREATE TRIGGER log_users_delete
  AFTER DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_delete();

-- Profiles table
DROP TRIGGER IF EXISTS log_profiles_insert ON profiles;
CREATE TRIGGER log_profiles_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_insert();

DROP TRIGGER IF EXISTS log_profiles_update ON profiles;
CREATE TRIGGER log_profiles_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_update();

DROP TRIGGER IF EXISTS log_profiles_delete ON profiles;
CREATE TRIGGER log_profiles_delete
  AFTER DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_delete();

-- Services table
DROP TRIGGER IF EXISTS log_services_insert ON services;
CREATE TRIGGER log_services_insert
  AFTER INSERT ON services
  FOR EACH ROW
  EXECUTE FUNCTION log_insert();

DROP TRIGGER IF EXISTS log_services_update ON services;
CREATE TRIGGER log_services_update
  AFTER UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION log_update();

DROP TRIGGER IF EXISTS log_services_delete ON services;
CREATE TRIGGER log_services_delete
  AFTER DELETE ON services
  FOR EACH ROW
  EXECUTE FUNCTION log_delete();

-- Appointments table
DROP TRIGGER IF EXISTS log_appointments_insert ON appointments;
CREATE TRIGGER log_appointments_insert
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION log_insert();

DROP TRIGGER IF EXISTS log_appointments_update ON appointments;
CREATE TRIGGER log_appointments_update
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION log_update();

DROP TRIGGER IF EXISTS log_appointments_delete ON appointments;
CREATE TRIGGER log_appointments_delete
  AFTER DELETE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION log_delete();

-- Promotions table
DROP TRIGGER IF EXISTS log_promotions_insert ON promotions;
CREATE TRIGGER log_promotions_insert
  AFTER INSERT ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION log_insert();

DROP TRIGGER IF EXISTS log_promotions_update ON promotions;
CREATE TRIGGER log_promotions_update
  AFTER UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION log_update();

DROP TRIGGER IF EXISTS log_promotions_delete ON promotions;
CREATE TRIGGER log_promotions_delete
  AFTER DELETE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION log_delete();

-- Partners table
DROP TRIGGER IF EXISTS log_partners_insert ON partners;
CREATE TRIGGER log_partners_insert
  AFTER INSERT ON partners
  FOR EACH ROW
  EXECUTE FUNCTION log_insert();

DROP TRIGGER IF EXISTS log_partners_update ON partners;
CREATE TRIGGER log_partners_update
  AFTER UPDATE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION log_update();

DROP TRIGGER IF EXISTS log_partners_delete ON partners;
CREATE TRIGGER log_partners_delete
  AFTER DELETE ON partners
  FOR EACH ROW
  EXECUTE FUNCTION log_delete();

-- Function to log auth events
CREATE OR REPLACE FUNCTION log_auth_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO logs (
    user_id,
    action,
    table_name,
    metadata
  ) VALUES (
    NEW.id,
    CASE
      WHEN TG_OP = 'INSERT' THEN 'login'
      WHEN TG_OP = 'DELETE' THEN 'logout'
      ELSE TG_OP::text
    END,
    'auth.sessions',
    jsonb_build_object(
      'event', TG_OP,
      'user_email', (SELECT email FROM auth.users WHERE id = NEW.id)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample log data
INSERT INTO logs (
  user_id,
  action,
  table_name,
  record_id,
  timestamp,
  metadata
)
SELECT
  id as user_id,
  action,
  table_name,
  gen_random_uuid() as record_id,
  now() - (random() * interval '30 days') as timestamp,
  jsonb_build_object(
    'details', details,
    'ip_address', '192.168.' || floor(random() * 255)::text || '.' || floor(random() * 255)::text,
    'user_agent', CASE floor(random() * 3)
      WHEN 0 THEN 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      WHEN 1 THEN 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
      ELSE 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    END
  ) as metadata
FROM auth.users
CROSS JOIN (
  VALUES 
    ('create', 'users', 'Created new user account'),
    ('update', 'users', 'Updated user profile information'),
    ('create', 'appointments', 'Booked new appointment'),
    ('update', 'appointments', 'Rescheduled appointment'),
    ('delete', 'appointments', 'Cancelled appointment'),
    ('create', 'services', 'Added new service'),
    ('update', 'services', 'Updated service details'),
    ('create', 'promotions', 'Created new promotion'),
    ('update', 'promotions', 'Updated promotion details'),
    ('delete', 'promotions', 'Deleted expired promotion'),
    ('create', 'partners', 'Added new partner'),
    ('update', 'partners', 'Updated partner information'),
    ('create', 'profiles', 'Created user profile'),
    ('update', 'profiles', 'Updated profile information'),
    ('login', 'auth.sessions', 'User logged in'),
    ('logout', 'auth.sessions', 'User logged out')
) as t(action, table_name, details)
WHERE random() < 0.2 -- 20% chance of creating a log for each combination
ORDER BY random()
LIMIT 500;