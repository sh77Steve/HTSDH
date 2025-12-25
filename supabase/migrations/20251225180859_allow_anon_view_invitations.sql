/*
  # Allow Anonymous Users to View Valid Invitations

  1. Changes
    - Add RLS policy to allow anonymous users to view unexpired, unused invitations by code
    - This enables the invitation redemption page to work for users who aren't logged in yet

  2. Security
    - Only allows viewing invitations that are:
      - Not yet used (used_at IS NULL)
      - Not expired (expires_at > now())
    - Anonymous users can only view, not create or modify invitations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'invitations' 
    AND policyname = 'Anonymous users can view valid invitations'
  ) THEN
    CREATE POLICY "Anonymous users can view valid invitations"
      ON invitations
      FOR SELECT
      TO anon
      USING (
        used_at IS NULL 
        AND expires_at > now()
      );
  END IF;
END $$;