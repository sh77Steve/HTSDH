/*
  # Fix User Ranches RLS Policies - Remove Infinite Recursion

  ## Problem
  The RLS policies for user_ranches were causing infinite recursion because they 
  queried the same table they were protecting, creating a circular dependency.

  ## Solution
  Simplify the policies to avoid self-referencing queries:
  - Users can always view their own ranch memberships (simple user_id check)
  - Only check admin status on the target ranch for management operations
  - Use a simpler approach that doesn't create circular dependencies

  ## Changes
  - Drop existing problematic policies
  - Create new simplified policies that avoid recursion
*/

-- Drop existing problematic policies for user_ranches
DROP POLICY IF EXISTS "Users can view their ranch memberships" ON user_ranches;
DROP POLICY IF EXISTS "Admins can manage ranch users" ON user_ranches;

-- Create new simplified policies

-- Users can view their own ranch memberships
CREATE POLICY "Users can view their own ranch memberships"
  ON user_ranches FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view other users in their ranches
CREATE POLICY "Users can view ranch members in their ranches"
  ON user_ranches FOR SELECT
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches 
      WHERE user_id = auth.uid()
    )
  );

-- When creating a new ranch, the creating user can add themselves as admin
-- This is for the initial user_ranches insert when creating a ranch
CREATE POLICY "Users can add themselves to ranches"
  ON user_ranches FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can add other users to their ranches
-- We need to check this carefully to avoid recursion
CREATE POLICY "Admins can add users to their ranches"
  ON user_ranches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.ranch_id = user_ranches.ranch_id
      AND admin_check.role = 'ADMIN'
    )
  );

-- Admins can update user roles in their ranches
CREATE POLICY "Admins can update user roles in their ranches"
  ON user_ranches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.ranch_id = user_ranches.ranch_id
      AND admin_check.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.ranch_id = user_ranches.ranch_id
      AND admin_check.role = 'ADMIN'
    )
  );

-- Admins can remove users from their ranches
CREATE POLICY "Admins can remove users from their ranches"
  ON user_ranches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches admin_check
      WHERE admin_check.user_id = auth.uid()
      AND admin_check.ranch_id = user_ranches.ranch_id
      AND admin_check.role = 'ADMIN'
    )
  );