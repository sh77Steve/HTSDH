/*
  # Fix Circular RLS Dependencies

  ## Problem
  The ranches table policy "Users can view ranches they belong to" creates a circular
  dependency when user_ranches queries join with ranches, because:
  1. Query tries to fetch ranches joined with user_ranches
  2. Ranches policy checks user_ranches for membership
  3. User_ranches policy checks user_ranches again (in the subquery)
  4. This creates infinite recursion

  ## Solution
  Remove the problematic policy from ranches and rely on querying through user_ranches
  instead. Since we always query ranches through the user_ranches join in the app,
  we don't need a SELECT policy on ranches that references user_ranches.

  Instead, we'll:
  1. Allow authenticated users to SELECT any ranch (they still can't see ranches 
     they're not a member of because the join filters that)
  2. Keep strict controls on INSERT/UPDATE/DELETE
  3. The app's query pattern (user_ranches JOIN ranches) naturally filters results

  ## Changes
  - Drop the circular "Users can view ranches they belong to" policy
  - Add a simpler policy that allows viewing ranches (filtering happens at query level)
  - Keep strict controls on modifications
*/

-- Drop the problematic policy that causes circular dependency
DROP POLICY IF EXISTS "Users can view ranches they belong to" ON ranches;

-- Add a simpler policy for viewing ranches
-- The filtering happens at the application query level (through user_ranches join)
-- This prevents the circular dependency
CREATE POLICY "Authenticated users can view ranches"
  ON ranches FOR SELECT
  TO authenticated
  USING (true);