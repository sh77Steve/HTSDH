/*
  # Fix RLS Policies

  1. Changes
    - Drop problematic policies causing infinite recursion
    - Add INSERT policy for users table
    - Simplify user_ranches policies to avoid recursion
    
  2. Security
    - Allow authenticated users to insert their own user record
    - Fix user_ranches policies to prevent infinite recursion
*/

-- Drop problematic policies
DROP POLICY IF EXISTS "Admins can manage ranch members" ON user_ranches;
DROP POLICY IF EXISTS "Users can create ranch associations" ON user_ranches;

-- Add INSERT policy for users table
CREATE POLICY "Users can create their own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Recreate user_ranches policies without recursion
CREATE POLICY "Users can insert their own ranch associations"
  ON user_ranches FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update ranch members"
  ON user_ranches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches ur
      WHERE ur.ranch_id = user_ranches.ranch_id
      AND ur.user_id = auth.uid()
      AND ur.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can delete ranch members"
  ON user_ranches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches ur
      WHERE ur.ranch_id = user_ranches.ranch_id
      AND ur.user_id = auth.uid()
      AND ur.role = 'ADMIN'
    )
  );
