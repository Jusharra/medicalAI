/*
  # Fix Authentication Schema and Setup
  
  1. Purpose
    - Ensure proper auth schema setup
    - Fix schema querying issues
    - Set up proper auth tables and functions
    
  2. Changes
    - Create auth schema if not exists
    - Create required auth functions
    - Set up proper auth tables
*/

-- Create auth schema if not exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Create auth.users table if not exists
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid,
  aud character varying(255),
  role character varying(255),
  email character varying(255),
  encrypted_password character varying(255),
  email_confirmed_at timestamp with time zone,
  invited_at timestamp with time zone,
  confirmation_token character varying(255),
  confirmation_sent_at timestamp with time zone,
  recovery_token character varying(255),
  recovery_sent_at timestamp with time zone,
  email_change_token_new character varying(255),
  email_change character varying(255),
  email_change_sent_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  phone character varying(255),
  phone_confirmed_at timestamp with time zone,
  phone_change character varying(255),
  phone_change_token character varying(255),
  phone_change_sent_at timestamp with time zone,
  email_change_token_current character varying(255),
  email_change_confirm_status smallint,
  banned_until timestamp with time zone,
  reauthentication_token character varying(255),
  reauthentication_sent_at timestamp with time zone,
  is_sso_user boolean DEFAULT false,
  deleted_at timestamp with time zone
);

-- Create auth.identities table if not exists
CREATE TABLE IF NOT EXISTS auth.identities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  identity_data jsonb NOT NULL,
  provider character varying(255) NOT NULL,
  provider_id character varying(255),
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create auth.sessions table if not exists
CREATE TABLE IF NOT EXISTS auth.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  factor_id uuid,
  aal aal_level,
  not_after timestamp with time zone,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create auth.refresh_tokens table if not exists
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
  id bigint NOT NULL,
  token character varying(255),
  user_id uuid,
  revoked boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  parent character varying(255),
  session_id uuid REFERENCES auth.sessions(id) ON DELETE CASCADE,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create required indexes
CREATE INDEX IF NOT EXISTS users_instance_id_idx ON auth.users(instance_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON auth.users(email);
CREATE UNIQUE INDEX IF NOT EXISTS identities_provider_id_provider_idx ON auth.identities(provider_id, provider);
CREATE INDEX IF NOT EXISTS refresh_tokens_instance_id_idx ON auth.refresh_tokens(instance_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens(instance_id, user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_parent_idx ON auth.refresh_tokens(parent);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON auth.refresh_tokens(token);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS users_instance_id_email_idx ON auth.users(instance_id, email);

-- Create test user
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  last_sign_in_at
) VALUES (
  'efbd2fb4-4a3b-4d6e-a553-eec02a567ba8',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'test@vitale.health',
  crypt('Test123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  now(),
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;