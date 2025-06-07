/*
  # Create tokens table for OAuth token management

  1. New Tables
    - `tokens`
      - `id` (uuid, primary key)
      - `service` (text, service name like 'reddit')
      - `access_token` (text, current access token)
      - `refresh_token` (text, refresh token for renewals)
      - `expires_at` (timestamptz, when token expires)
      - `created_at` (timestamptz, when record was created)
      - `updated_at` (timestamptz, when record was last updated)

  2. Security
    - Enable RLS on `tokens` table
    - Add policy for service role access only
*/

CREATE TABLE IF NOT EXISTS tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage tokens (for security)
CREATE POLICY "Service role can manage tokens"
  ON tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS tokens_service_idx ON tokens(service);
CREATE INDEX IF NOT EXISTS tokens_expires_at_idx ON tokens(expires_at);