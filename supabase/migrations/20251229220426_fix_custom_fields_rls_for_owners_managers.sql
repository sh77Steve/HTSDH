/*
  # Fix Custom Field Definitions RLS Policies

  1. Changes
    - Update RLS policy to allow OWNER and MANAGER roles to manage custom fields
    - Previously only ADMIN role could insert/update/delete custom fields
    - This was incorrect as ADMIN is for system administrators, not ranch owners
  
  2. Security
    - OWNER and MANAGER roles can now insert, update, and delete custom fields for their ranches
    - MEMBER role can only view custom fields (existing SELECT policy)
    - Users can only manage custom fields for ranches they belong to
*/

DROP POLICY IF EXISTS "Admins can manage custom fields for their ranches" ON custom_field_definitions;

CREATE POLICY "Owners and managers can manage custom fields"
  ON custom_field_definitions
  FOR ALL
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id 
      FROM user_ranches 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'MANAGER')
    )
  )
  WITH CHECK (
    ranch_id IN (
      SELECT ranch_id 
      FROM user_ranches 
      WHERE user_id = auth.uid() 
      AND role IN ('OWNER', 'MANAGER')
    )
  );
