/*
  # Fix Tips & Tricks RLS Policy
  
  1. Changes
    - Drop existing admin policies that check user_ranches table
    - Create new policies that check the admins table instead
  
  2. Security
    - Only users in the admins table can update/insert tips & tricks
    - All authenticated users can still read
*/

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can update tips & tricks" ON tips_tricks;
DROP POLICY IF EXISTS "Admins can insert tips & tricks" ON tips_tricks;

-- Create new policy: Only admins table members can update tips & tricks
CREATE POLICY "Admins can update tips & tricks"
  ON tips_tricks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Create new policy: Only admins table members can insert tips & tricks
CREATE POLICY "Admins can insert tips & tricks"
  ON tips_tricks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );
