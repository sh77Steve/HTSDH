/*
  # Add Licensing System
  
  ## Overview
  Implements a comprehensive licensing system with admin controls, license key generation,
  activation, and enforcement with grace periods.
  
  ## New Tables
  
  ### 1. admins
  - `user_id` (uuid, primary key) - References auth.users
  - `created_at` (timestamptz) - When admin was created
  - Purpose: Controls who can generate license keys
  
  ### 2. license_keys
  - `id` (uuid, primary key) - Unique identifier
  - `key` (text, unique) - Human-readable license key (e.g., HTBD-2025-A4B3-X7Y9)
  - `license_type` (text) - Either 'full' or 'demo'
  - `expiration_date` (date) - When the license expires
  - `used_by_ranch_id` (uuid, nullable) - Which ranch activated this key (null = unused)
  - `created_at` (timestamptz) - When key was generated
  - `created_by_user_id` (uuid) - Admin who created the key
  
  ## Modified Tables
  
  ### ranches (added columns)
  - `active_license_key` (text, nullable) - The license key currently in use
  - `license_type` (text, nullable) - 'full' or 'demo'
  - `license_expiration` (date, nullable) - When the license expires
  - `license_activated_at` (timestamptz, nullable) - When the license was activated
  
  ## Security
  
  ### admins table
  - RLS enabled
  - Admins can view admin list
  - Only system can insert (manual SQL by super admin)
  
  ### license_keys table
  - RLS enabled
  - Admins can create and view all keys
  - Regular users can only view unused keys (for activation)
  - Once used, keys are only visible to the ranch that owns them
  
  ### ranches table
  - Updated policies to allow users to update their ranch's license fields
  
  ## Important Notes
  
  1. The first admin must be added manually via SQL after user signup
  2. License keys are single-use - once activated, they're bound to that ranch
  3. Demo licenses allow maximum 10 cattle
  4. Grace period of 30 days after expiration (enforced in application logic)
*/

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Admins can view the admin list
CREATE POLICY "Admins can view admin list"
  ON admins
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- Create license_keys table
CREATE TABLE IF NOT EXISTS license_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  license_type text NOT NULL CHECK (license_type IN ('full', 'demo')),
  expiration_date date NOT NULL,
  used_by_ranch_id uuid REFERENCES ranches(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE license_keys ENABLE ROW LEVEL SECURITY;

-- Admins can create license keys
CREATE POLICY "Admins can create license keys"
  ON license_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- Admins can view all license keys
CREATE POLICY "Admins can view all license keys"
  ON license_keys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE admins.user_id = auth.uid()
    )
  );

-- Regular users can view unused keys (for activation) and their own used keys
CREATE POLICY "Users can view unused keys and their own keys"
  ON license_keys
  FOR SELECT
  TO authenticated
  USING (
    used_by_ranch_id IS NULL
    OR used_by_ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

-- Users can update keys when activating (sets used_by_ranch_id)
CREATE POLICY "Users can activate unused keys"
  ON license_keys
  FOR UPDATE
  TO authenticated
  USING (used_by_ranch_id IS NULL)
  WITH CHECK (
    used_by_ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

-- Add license columns to ranches table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranches' AND column_name = 'active_license_key'
  ) THEN
    ALTER TABLE ranches ADD COLUMN active_license_key text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranches' AND column_name = 'license_type'
  ) THEN
    ALTER TABLE ranches ADD COLUMN license_type text CHECK (license_type IN ('full', 'demo'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranches' AND column_name = 'license_expiration'
  ) THEN
    ALTER TABLE ranches ADD COLUMN license_expiration date;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranches' AND column_name = 'license_activated_at'
  ) THEN
    ALTER TABLE ranches ADD COLUMN license_activated_at timestamptz;
  END IF;
END $$;

-- Update ranches policies to allow license field updates
DROP POLICY IF EXISTS "Users can update their ranch" ON ranches;

CREATE POLICY "Users can update their ranch"
  ON ranches
  FOR UPDATE
  TO authenticated
  USING (
    id IN (SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid())
  )
  WITH CHECK (
    id IN (SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid())
  );

-- Create index for faster license key lookups
CREATE INDEX IF NOT EXISTS idx_license_keys_key ON license_keys(key);
CREATE INDEX IF NOT EXISTS idx_license_keys_used_by_ranch ON license_keys(used_by_ranch_id);
CREATE INDEX IF NOT EXISTS idx_ranches_license_expiration ON ranches(license_expiration);