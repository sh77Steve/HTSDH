/*
  # Fix License Keys RLS Policies

  1. Changes
    - Drop old RLS policies that check user_ranches for ADMIN role
    - Create new RLS policies that check the admins table
  
  2. Security
    - Only system admins (from admins table) can insert/update/delete license keys
    - Only system admins can view license keys
*/

-- Drop old policies
DROP POLICY IF EXISTS "Admins can insert license keys" ON license_keys;
DROP POLICY IF EXISTS "Admins can update license keys" ON license_keys;
DROP POLICY IF EXISTS "Admins can delete license keys" ON license_keys;
DROP POLICY IF EXISTS "Admins can view all license keys" ON license_keys;

-- Create new policies using admins table
CREATE POLICY "System admins can insert license keys"
  ON license_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "System admins can update license keys"
  ON license_keys
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "System admins can delete license keys"
  ON license_keys
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

CREATE POLICY "System admins can view all license keys"
  ON license_keys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );