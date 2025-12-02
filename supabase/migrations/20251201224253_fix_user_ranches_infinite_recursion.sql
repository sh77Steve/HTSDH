/*
  # Fix User Ranches Infinite Recursion (Final Fix)

  ## Problem
  The previous performance optimization migration (20251201194529) accidentally reintroduced 
  infinite recursion in the user_ranches SELECT policy by using a subquery that references 
  user_ranches within itself.

  ## Solution
  Replace the problematic SELECT policy with a simpler version that uses the existing
  is_ranch_member() helper function which was created specifically to avoid this issue.

  ## Changes
  1. Drop the problematic "Users can view ranch memberships" policy
  2. Create two separate, simple policies:
     - One for viewing own memberships (no recursion)
     - One for viewing other members in ranches (uses helper function)
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view ranch memberships" ON user_ranches;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own memberships"
  ON user_ranches FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can view members in their ranches"
  ON user_ranches FOR SELECT
  TO authenticated
  USING (is_ranch_member((SELECT auth.uid()), ranch_id));
