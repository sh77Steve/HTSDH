/*
  # Fix users table RLS policies for lookups

  1. Changes
    - Add policy to allow authenticated users to SELECT from users table
    - This is needed for invitation validation and user lookups
    - Users can now see basic user info (id, email, name) of other users in the system

  2. Security
    - Only authenticated users can access user data
    - This follows industry standard patterns (e.g., Slack, GitHub show user info to team members)
    - Sensitive auth data remains protected in auth.users table
*/

-- Add policy for authenticated users to view all users
-- This is needed for:
-- 1. Validating invitation email restrictions
-- 2. Looking up user information for collaboration features
-- 3. Checking if users exist in the system
CREATE POLICY "Authenticated users can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);
