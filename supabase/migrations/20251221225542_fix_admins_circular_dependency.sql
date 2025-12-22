/*
  # Fix Admins Table Circular Dependency

  The "Admins can view all admin records" policy creates a circular dependency
  because it tries to SELECT from the admins table while evaluating RLS on the
  same admins table. This causes a 500 Internal Server Error.

  Solution:
  - Drop the problematic policy with the circular subquery
  - Keep the simple policy that allows users to check their own admin status

  The simple policy is sufficient for the app's needs - users just need to check
  if they themselves are an admin.
*/

-- Drop the problematic policy with circular dependency
DROP POLICY IF EXISTS "Admins can view all admin records" ON public.admins;
