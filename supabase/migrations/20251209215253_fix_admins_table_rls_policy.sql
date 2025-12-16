/*
  # Fix Admin Table RLS Policy

  1. Changes
    - Drop the circular RLS policy on admins table
    - Add new policy allowing users to check if they themselves are an admin
    
  2. Security
    - Users can only view their own admin status
    - Cannot view other users' admin records
*/

DROP POLICY IF EXISTS "Admins can view admin list" ON admins;

CREATE POLICY "Users can check their own admin status"
  ON admins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
