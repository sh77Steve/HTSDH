/*
  # Add Admin Policy to View All Ranches
  
  1. Problem
    - System Report needs to show all ranches across the system
    - Current RLS policy only allows users to see ranches they belong to
    - Admins cannot see ranches they don't belong to
    
  2. Solution
    - Add a new SELECT policy for admins to view all ranches
    - This allows the System Report to work properly for admin users
    
  3. Changes
    - Add policy "Admins can view all ranches" to ranches table
    - Policy checks if user exists in admins table
*/

-- Add policy allowing admins to view all ranches
CREATE POLICY "Admins can view all ranches"
  ON ranches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );
