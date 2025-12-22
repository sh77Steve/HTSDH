/*
  # Fix Admins Table RLS Policy
  
  The current RLS policy on the admins table creates a chicken-and-egg problem:
  - Users need to query the admins table to check if they're an admin
  - But the policy requires them to already be an admin to query the table
  
  This migration fixes the policy to allow any authenticated user to check if THEY
  are an admin by querying their own record.
  
  Changes:
  - Drop the existing restrictive SELECT policy
  - Add a new policy that allows users to view their own admin status
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can view all admin records" ON public.admins;

-- Allow any authenticated user to check if they are an admin
CREATE POLICY "Users can view own admin status"
  ON public.admins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all admin records
CREATE POLICY "Admins can view all admin records"
  ON public.admins
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM public.admins)
  );
