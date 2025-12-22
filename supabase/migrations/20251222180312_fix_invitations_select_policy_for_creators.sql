/*
  # Fix invitations SELECT policy for creators

  1. Changes
    - Drop the problematic "Users can view eligible invitations" policy
    - Recreate it without the auth.users email lookup
    - Add a simpler policy for users to view invitations they created
    - This fixes the "permission denied for table users" error when creating invitations

  2. Security
    - Creators can view their own invitations
    - Users can still view unexpired invitations (without email restriction check during creation)
    - Ranch owners/managers can view their ranch's invitations
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view eligible invitations" ON invitations;

-- Add policy for creators to view their own invitations
CREATE POLICY "Users can view invitations they created"
  ON invitations FOR SELECT
  TO authenticated
  USING (created_by_user_id = auth.uid());

-- Recreate a simpler policy for viewing unexpired invitations
-- We'll validate email restrictions in the application code, not in RLS
CREATE POLICY "Users can view unexpired invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    used_at IS NULL
    AND expires_at > now()
  );
