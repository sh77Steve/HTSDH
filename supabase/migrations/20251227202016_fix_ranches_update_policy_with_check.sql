/*
  # Fix ranches UPDATE policy to include WITH CHECK clause

  1. Changes
    - Drop the existing UPDATE policy for ranches
    - Recreate it with both USING and WITH CHECK clauses

  2. Security
    - USING clause: checks if user has OWNER or MANAGER role before allowing update
    - WITH CHECK clause: validates that the updated data meets the same requirements
    - This prevents the "policy violation" error that was causing both success and error messages
*/

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Owners and managers can update their ranches" ON ranches;

-- Recreate with both USING and WITH CHECK
CREATE POLICY "Owners and managers can update their ranches"
  ON ranches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranches.id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranches.id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );
