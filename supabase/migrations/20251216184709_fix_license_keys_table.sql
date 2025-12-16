/*
  # Fix License Keys Table

  1. Changes
    - Add missing `max_animals` column to license_keys table
    - Drop old RLS policy that references non-existent admins table
    - Add new RLS policies that use user_ranches with ADMIN role
  
  2. Security
    - Only users with ADMIN role can insert/update/delete license keys
    - All authenticated users can view available license keys
*/

-- Add max_animals column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'license_keys' AND column_name = 'max_animals'
  ) THEN
    ALTER TABLE license_keys ADD COLUMN max_animals integer NOT NULL DEFAULT 50;
  END IF;
END $$;

-- Drop the old policy that references the admins table
DROP POLICY IF EXISTS "Admins can manage all license keys" ON license_keys;

-- Create new policies using user_ranches
CREATE POLICY "Admins can insert license keys"
  ON license_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update license keys"
  ON license_keys
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can delete license keys"
  ON license_keys
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can view all license keys"
  ON license_keys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'ADMIN'
    )
  );