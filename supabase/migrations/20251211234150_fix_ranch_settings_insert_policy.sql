/*
  # Fix Ranch Settings Insert Policy

  1. Changes
    - Drop the problematic "ALL" policy on ranch_settings
    - Add separate policies for INSERT, SELECT, UPDATE, DELETE
    - Allow authenticated users to insert ranch_settings for ranches where they are admins in user_ranches
    
  2. Security
    - Users can only insert settings for ranches where they have an ADMIN role
    - Users can view settings for any ranch they belong to
    - Only admins can update/delete settings
*/

-- Drop the existing ALL policy
DROP POLICY IF EXISTS "Admins can manage ranch settings" ON ranch_settings;

-- Add INSERT policy with WITH CHECK
CREATE POLICY "Admins can insert ranch settings"
  ON ranch_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranch_settings.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'ADMIN'
    )
  );

-- Add UPDATE policy
CREATE POLICY "Admins can update ranch settings"
  ON ranch_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranch_settings.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranch_settings.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'ADMIN'
    )
  );

-- Add DELETE policy
CREATE POLICY "Admins can delete ranch settings"
  ON ranch_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranch_settings.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'ADMIN'
    )
  );
