/*
  # Fix User Ranches Infinite Recursion with Helper Function

  ## Problem
  All policies on user_ranches that query user_ranches itself create infinite recursion.
  This includes:
  - "Users can view ranch members in their ranches" - queries user_ranches in SELECT policy
  - All admin policies - query user_ranches to check admin status
  
  ## Solution
  Create a security definer function that bypasses RLS to check ranch membership,
  then use this function in policies instead of direct queries.

  ## Changes
  1. Create helper function to check ranch membership (bypasses RLS)
  2. Drop all existing problematic policies
  3. Create new simplified policies using the helper function
*/

-- Create a security definer function to check if user is member of a ranch
-- This function bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION is_ranch_member(check_user_id uuid, check_ranch_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_ranches
    WHERE user_id = check_user_id 
    AND ranch_id = check_ranch_id
  );
END;
$$;

-- Create a security definer function to check if user is admin of a ranch
CREATE OR REPLACE FUNCTION is_ranch_admin(check_user_id uuid, check_ranch_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_ranches
    WHERE user_id = check_user_id 
    AND ranch_id = check_ranch_id 
    AND role = 'ADMIN'
  );
END;
$$;

-- Drop all existing user_ranches policies
DROP POLICY IF EXISTS "Users can view their own ranch memberships" ON user_ranches;
DROP POLICY IF EXISTS "Users can view ranch members in their ranches" ON user_ranches;
DROP POLICY IF EXISTS "Users can add themselves to ranches" ON user_ranches;
DROP POLICY IF EXISTS "Admins can add users to their ranches" ON user_ranches;
DROP POLICY IF EXISTS "Admins can update user roles in their ranches" ON user_ranches;
DROP POLICY IF EXISTS "Admins can remove users from their ranches" ON user_ranches;

-- Create new simplified policies using helper functions

-- SELECT: Users can view their own memberships
CREATE POLICY "Users can view own memberships"
  ON user_ranches FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- SELECT: Users can view other members in ranches they belong to
CREATE POLICY "Users can view members in their ranches"
  ON user_ranches FOR SELECT
  TO authenticated
  USING (is_ranch_member(auth.uid(), ranch_id));

-- INSERT: Users can add themselves as members (for new ranch creation)
CREATE POLICY "Users can insert own membership"
  ON user_ranches FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- INSERT: Admins can add other users
CREATE POLICY "Admins can insert members"
  ON user_ranches FOR INSERT
  TO authenticated
  WITH CHECK (is_ranch_admin(auth.uid(), ranch_id));

-- UPDATE: Admins can update roles
CREATE POLICY "Admins can update members"
  ON user_ranches FOR UPDATE
  TO authenticated
  USING (is_ranch_admin(auth.uid(), ranch_id))
  WITH CHECK (is_ranch_admin(auth.uid(), ranch_id));

-- DELETE: Admins can remove members
CREATE POLICY "Admins can delete members"
  ON user_ranches FOR DELETE
  TO authenticated
  USING (is_ranch_admin(auth.uid(), ranch_id));