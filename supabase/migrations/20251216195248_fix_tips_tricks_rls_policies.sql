/*
  # Fix Tips & Tricks RLS Policies

  1. Changes
    - Drop existing policies
    - Recreate policies with correct role check (ADMIN instead of admin)
  
  2. Security
    - Maintain same security model but fix case sensitivity issue
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read tips & tricks" ON tips_tricks;
DROP POLICY IF EXISTS "Admins can update tips & tricks" ON tips_tricks;
DROP POLICY IF EXISTS "Admins can insert tips & tricks" ON tips_tricks;

-- Recreate policies with correct role check
CREATE POLICY "Authenticated users can read tips & tricks"
  ON tips_tricks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update tips & tricks"
  ON tips_tricks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can insert tips & tricks"
  ON tips_tricks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'ADMIN'
    )
  );