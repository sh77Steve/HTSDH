/*
  # Fix RLS Policies for OWNER and MANAGER Roles

  ## Problem
  Ranch creators are assigned OWNER role, but most RLS policies only check for ADMIN role.
  This prevents ranch owners from managing their own ranches.

  ## Solution
  Update all ranch-level policies to recognize OWNER and MANAGER roles as having
  administrative privileges for their ranches. ADMIN role remains for system-level
  administration (license keys, etc.).

  ## Changes
  Update policies on these tables:
  1. user_ranches - Managing ranch members
  2. ranches - Updating ranch settings
  3. ranch_settings - Managing ranch settings
  4. animals - Deleting animals
  5. drugs - Managing drug list
  6. tips_tricks - System admins only

  ## Security
  - OWNER: Full control over their ranch
  - MANAGER: Can manage ranch operations and members
  - ADMIN: System-level operations (license management)
*/

-- ============================================================================
-- USER_RANCHES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can update ranch members" ON user_ranches;
DROP POLICY IF EXISTS "Admins can delete ranch members" ON user_ranches;

CREATE POLICY "Owners and managers can update ranch members"
  ON user_ranches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches ur
      WHERE ur.ranch_id = user_ranches.ranch_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('OWNER', 'MANAGER')
    )
  );

CREATE POLICY "Owners and managers can delete ranch members"
  ON user_ranches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches ur
      WHERE ur.ranch_id = user_ranches.ranch_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('OWNER', 'MANAGER')
    )
  );

-- Policy: Owners and managers can add new members to their ranch
CREATE POLICY "Owners and managers can add ranch members"
  ON user_ranches FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() -- Can add themselves
    OR EXISTS (
      SELECT 1 FROM user_ranches ur
      WHERE ur.ranch_id = user_ranches.ranch_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('OWNER', 'MANAGER')
    )
  );

-- ============================================================================
-- RANCHES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can update their ranches" ON ranches;

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
  );

-- ============================================================================
-- RANCH_SETTINGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can insert ranch settings" ON ranch_settings;
DROP POLICY IF EXISTS "Admins can view their ranch settings" ON ranch_settings;
DROP POLICY IF EXISTS "Admins can update ranch settings" ON ranch_settings;

CREATE POLICY "Owners and managers can insert ranch settings"
  ON ranch_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranch_settings.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );

CREATE POLICY "Owners and managers can view their ranch settings"
  ON ranch_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranch_settings.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );

CREATE POLICY "Owners and managers can update ranch settings"
  ON ranch_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranch_settings.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );

-- ============================================================================
-- ANIMALS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can delete animals" ON animals;

CREATE POLICY "Owners and managers can delete animals"
  ON animals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = animals.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );

-- ============================================================================
-- DRUGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can insert drugs" ON drugs;
DROP POLICY IF EXISTS "Admins can update drugs" ON drugs;
DROP POLICY IF EXISTS "Admins can delete drugs" ON drugs;

CREATE POLICY "Owners and managers can insert drugs"
  ON drugs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = drugs.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );

CREATE POLICY "Owners and managers can update drugs"
  ON drugs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = drugs.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );

CREATE POLICY "Owners and managers can delete drugs"
  ON drugs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = drugs.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );

-- ============================================================================
-- LICENSE_KEYS TABLE (Keep as system admin only)
-- ============================================================================

-- License key management remains system admin only
-- No changes needed - already checks admins table

-- ============================================================================
-- TIPS_TRICKS TABLE (Keep as system admin only)
-- ============================================================================

-- Tips & tricks management remains system admin only
-- No changes needed - already checks admins table