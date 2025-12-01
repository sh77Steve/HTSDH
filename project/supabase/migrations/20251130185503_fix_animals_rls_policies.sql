/*
  # Fix Animals Table RLS Policies

  ## Problem
  The animals table policies query user_ranches directly, which can cause issues.
  We should use the helper functions we created earlier to avoid recursion problems.

  ## Changes
  - Drop existing policies
  - Create new policies using helper functions (is_ranch_member, is_ranch_admin)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view animals in their ranches" ON animals;
DROP POLICY IF EXISTS "Ranch hands and admins can insert animals" ON animals;
DROP POLICY IF EXISTS "Ranch hands and admins can update animals" ON animals;
DROP POLICY IF EXISTS "Only admins can delete animals" ON animals;

-- SELECT: Users can view animals in ranches they belong to
CREATE POLICY "Users can view ranch animals"
  ON animals FOR SELECT
  TO authenticated
  USING (is_ranch_member(auth.uid(), ranch_id));

-- INSERT: Admins can add animals
CREATE POLICY "Admins can insert animals"
  ON animals FOR INSERT
  TO authenticated
  WITH CHECK (is_ranch_admin(auth.uid(), ranch_id));

-- UPDATE: Admins can update animals
CREATE POLICY "Admins can update animals"
  ON animals FOR UPDATE
  TO authenticated
  USING (is_ranch_admin(auth.uid(), ranch_id))
  WITH CHECK (is_ranch_admin(auth.uid(), ranch_id));

-- DELETE: Admins can delete animals
CREATE POLICY "Admins can delete animals"
  ON animals FOR DELETE
  TO authenticated
  USING (is_ranch_admin(auth.uid(), ranch_id));