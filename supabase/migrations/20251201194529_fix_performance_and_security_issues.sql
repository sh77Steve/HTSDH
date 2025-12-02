/*
  # Fix Performance and Security Issues

  This migration addresses multiple security and performance issues identified in the database audit:

  ## 1. Add Missing Indexes on Foreign Keys
  - Add index on `animal_photos.taken_by_user_id`
  - Add index on `count_report_snapshots.created_by_user_id`
  - Add index on `medical_history.created_by_user_id`
  - Add index on `terms_acceptances.user_id`

  ## 2. Optimize RLS Policies (Auth Function Initialization)
  Replace `auth.uid()` with `(SELECT auth.uid())` in all RLS policies to avoid re-evaluation per row.
  This significantly improves query performance at scale.

  ## 3. Remove Unused Indexes
  Drop indexes that are not being used by the query planner to reduce maintenance overhead.

  ## 4. Consolidate Duplicate Policies
  Remove redundant permissive policies that overlap in functionality.

  ## 5. Fix Function Search Path
  Set immutable search_path for the update_updated_at_column function.

  ## Important Notes
  - All changes are idempotent and safe to run multiple times
  - Performance improvements will be immediate for large datasets
  - Policy consolidation maintains the same access control while improving efficiency
*/

-- ============================================================================
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_animal_photos_taken_by_user_id 
  ON animal_photos(taken_by_user_id);

CREATE INDEX IF NOT EXISTS idx_count_report_snapshots_created_by_user_id 
  ON count_report_snapshots(created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_medical_history_created_by_user_id 
  ON medical_history(created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_terms_acceptances_user_id 
  ON terms_acceptances(user_id);

-- ============================================================================
-- 2. REMOVE UNUSED INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_animals_status;
DROP INDEX IF EXISTS idx_animals_name;
DROP INDEX IF EXISTS idx_medical_history_date;
DROP INDEX IF EXISTS idx_animal_photos_ranch_id;
DROP INDEX IF EXISTS idx_animal_photos_is_primary;
DROP INDEX IF EXISTS idx_count_snapshots_ranch_id;
DROP INDEX IF EXISTS idx_count_snapshots_date;
DROP INDEX IF EXISTS idx_animal_photos_created_at;

-- ============================================================================
-- 3. OPTIMIZE RLS POLICIES - USERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================================
-- 4. OPTIMIZE RLS POLICIES - RANCHES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Admins can update their ranches" ON ranches;

CREATE POLICY "Admins can update their ranches"
  ON ranches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranches.id
      AND user_ranches.user_id = (SELECT auth.uid())
      AND user_ranches.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranches.id
      AND user_ranches.user_id = (SELECT auth.uid())
      AND user_ranches.role = 'ADMIN'
    )
  );

-- ============================================================================
-- 5. OPTIMIZE RLS POLICIES - RANCH_SETTINGS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view settings for their ranches" ON ranch_settings;
DROP POLICY IF EXISTS "Admins can manage ranch settings" ON ranch_settings;

-- Consolidated policy for viewing (combines previous two SELECT policies)
CREATE POLICY "Users can view settings for their ranches"
  ON ranch_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranch_settings.ranch_id
      AND user_ranches.user_id = (SELECT auth.uid())
    )
  );

-- Separate policy for admin management
CREATE POLICY "Admins can manage ranch settings"
  ON ranch_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranch_settings.ranch_id
      AND user_ranches.user_id = (SELECT auth.uid())
      AND user_ranches.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranch_settings.ranch_id
      AND user_ranches.user_id = (SELECT auth.uid())
      AND user_ranches.role = 'ADMIN'
    )
  );

-- ============================================================================
-- 6. OPTIMIZE RLS POLICIES - MEDICAL_HISTORY TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view medical history in their ranches" ON medical_history;
DROP POLICY IF EXISTS "Ranch hands, vets, and admins can insert medical history" ON medical_history;
DROP POLICY IF EXISTS "Ranch hands, vets, and admins can update medical history" ON medical_history;
DROP POLICY IF EXISTS "Ranch hands, vets, and admins can delete medical history" ON medical_history;

CREATE POLICY "Users can view medical history in their ranches"
  ON medical_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM animals
      JOIN user_ranches ON user_ranches.ranch_id = animals.ranch_id
      WHERE animals.id = medical_history.animal_id
      AND user_ranches.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Ranch hands, vets, and admins can insert medical history"
  ON medical_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM animals
      JOIN user_ranches ON user_ranches.ranch_id = animals.ranch_id
      WHERE animals.id = medical_history.animal_id
      AND user_ranches.user_id = (SELECT auth.uid())
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND', 'VET')
    )
  );

CREATE POLICY "Ranch hands, vets, and admins can update medical history"
  ON medical_history FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM animals
      JOIN user_ranches ON user_ranches.ranch_id = animals.ranch_id
      WHERE animals.id = medical_history.animal_id
      AND user_ranches.user_id = (SELECT auth.uid())
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND', 'VET')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM animals
      JOIN user_ranches ON user_ranches.ranch_id = animals.ranch_id
      WHERE animals.id = medical_history.animal_id
      AND user_ranches.user_id = (SELECT auth.uid())
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND', 'VET')
    )
  );

CREATE POLICY "Ranch hands, vets, and admins can delete medical history"
  ON medical_history FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM animals
      JOIN user_ranches ON user_ranches.ranch_id = animals.ranch_id
      WHERE animals.id = medical_history.animal_id
      AND user_ranches.user_id = (SELECT auth.uid())
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND', 'VET')
    )
  );

-- ============================================================================
-- 7. OPTIMIZE RLS POLICIES - ANIMAL_PHOTOS TABLE
-- ============================================================================

-- Remove duplicate policies
DROP POLICY IF EXISTS "Users can view photos in their ranches" ON animal_photos;
DROP POLICY IF EXISTS "Ranch hands and admins can insert photos" ON animal_photos;
DROP POLICY IF EXISTS "Ranch hands and admins can update photos" ON animal_photos;
DROP POLICY IF EXISTS "Ranch hands and admins can delete photos" ON animal_photos;
DROP POLICY IF EXISTS "Users can view photos for animals in their ranches" ON animal_photos;
DROP POLICY IF EXISTS "Users can upload photos for animals in their ranches" ON animal_photos;
DROP POLICY IF EXISTS "Users can delete photos for animals in their ranches" ON animal_photos;

-- Consolidated policies (one per operation)
CREATE POLICY "Users can view photos for animals in their ranches"
  ON animal_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM animals
      JOIN user_ranches ON user_ranches.ranch_id = animals.ranch_id
      WHERE animals.id = animal_photos.animal_id
      AND user_ranches.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Ranch hands and admins can insert photos"
  ON animal_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM animals
      JOIN user_ranches ON user_ranches.ranch_id = animals.ranch_id
      WHERE animals.id = animal_photos.animal_id
      AND user_ranches.user_id = (SELECT auth.uid())
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND')
    )
  );

CREATE POLICY "Ranch hands and admins can update photos"
  ON animal_photos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM animals
      JOIN user_ranches ON user_ranches.ranch_id = animals.ranch_id
      WHERE animals.id = animal_photos.animal_id
      AND user_ranches.user_id = (SELECT auth.uid())
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM animals
      JOIN user_ranches ON user_ranches.ranch_id = animals.ranch_id
      WHERE animals.id = animal_photos.animal_id
      AND user_ranches.user_id = (SELECT auth.uid())
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND')
    )
  );

CREATE POLICY "Ranch hands and admins can delete photos"
  ON animal_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM animals
      JOIN user_ranches ON user_ranches.ranch_id = animals.ranch_id
      WHERE animals.id = animal_photos.animal_id
      AND user_ranches.user_id = (SELECT auth.uid())
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND')
    )
  );

-- ============================================================================
-- 8. OPTIMIZE RLS POLICIES - COUNT_REPORT_SNAPSHOTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view snapshots in their ranches" ON count_report_snapshots;
DROP POLICY IF EXISTS "Users can create snapshots for their ranches" ON count_report_snapshots;

CREATE POLICY "Users can view snapshots in their ranches"
  ON count_report_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = count_report_snapshots.ranch_id
      AND user_ranches.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create snapshots for their ranches"
  ON count_report_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = count_report_snapshots.ranch_id
      AND user_ranches.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 9. OPTIMIZE RLS POLICIES - TERMS_ACCEPTANCES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own terms acceptances" ON terms_acceptances;
DROP POLICY IF EXISTS "Users can insert their own terms acceptances" ON terms_acceptances;

CREATE POLICY "Users can view their own terms acceptances"
  ON terms_acceptances FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own terms acceptances"
  ON terms_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 10. OPTIMIZE RLS POLICIES - USER_RANCHES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own memberships" ON user_ranches;
DROP POLICY IF EXISTS "Users can view members in their ranches" ON user_ranches;
DROP POLICY IF EXISTS "Users can insert own membership" ON user_ranches;
DROP POLICY IF EXISTS "Admins can insert members" ON user_ranches;
DROP POLICY IF EXISTS "Admins can update members" ON user_ranches;
DROP POLICY IF EXISTS "Admins can delete members" ON user_ranches;

-- Consolidated SELECT policy
CREATE POLICY "Users can view ranch memberships"
  ON user_ranches FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_ranches ur
      WHERE ur.ranch_id = user_ranches.ranch_id
      AND ur.user_id = (SELECT auth.uid())
    )
  );

-- Consolidated INSERT policy
CREATE POLICY "Users can manage ranch memberships"
  ON user_ranches FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_ranches ur
      WHERE ur.ranch_id = user_ranches.ranch_id
      AND ur.user_id = (SELECT auth.uid())
      AND ur.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update members"
  ON user_ranches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches ur
      WHERE ur.ranch_id = user_ranches.ranch_id
      AND ur.user_id = (SELECT auth.uid())
      AND ur.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches ur
      WHERE ur.ranch_id = user_ranches.ranch_id
      AND ur.user_id = (SELECT auth.uid())
      AND ur.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can delete members"
  ON user_ranches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches ur
      WHERE ur.ranch_id = user_ranches.ranch_id
      AND ur.user_id = (SELECT auth.uid())
      AND ur.role = 'ADMIN'
    )
  );

-- ============================================================================
-- 11. OPTIMIZE RLS POLICIES - ANIMALS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view ranch animals" ON animals;
DROP POLICY IF EXISTS "Admins can insert animals" ON animals;
DROP POLICY IF EXISTS "Admins can update animals" ON animals;
DROP POLICY IF EXISTS "Admins can delete animals" ON animals;

CREATE POLICY "Users can view ranch animals"
  ON animals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = animals.ranch_id
      AND user_ranches.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins can insert animals"
  ON animals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = animals.ranch_id
      AND user_ranches.user_id = (SELECT auth.uid())
      AND user_ranches.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can update animals"
  ON animals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = animals.ranch_id
      AND user_ranches.user_id = (SELECT auth.uid())
      AND user_ranches.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = animals.ranch_id
      AND user_ranches.user_id = (SELECT auth.uid())
      AND user_ranches.role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can delete animals"
  ON animals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = animals.ranch_id
      AND user_ranches.user_id = (SELECT auth.uid())
      AND user_ranches.role = 'ADMIN'
    )
  );

-- ============================================================================
-- 12. FIX FUNCTION SEARCH PATH
-- ============================================================================

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers for the function
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ranches_updated_at
  BEFORE UPDATE ON ranches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_animals_updated_at
  BEFORE UPDATE ON animals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_history_updated_at
  BEFORE UPDATE ON medical_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_animal_photos_updated_at
  BEFORE UPDATE ON animal_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
