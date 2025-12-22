/*
  # Create Invitations System

  ## Overview
  This migration creates a comprehensive invitation system for AmadorHerdInfo that:
  - Requires license keys before ranch creation (prevents spam)
  - Enables ranch owners to invite additional users
  - Supports email-restricted invitations
  - Provides secure single-use invitation codes

  ## New Tables
  
  ### `invitations`
  Stores invitation records for both ranch creation and adding users to existing ranches.
  
  - `id` (uuid, primary key) - Unique invitation identifier
  - `code` (text, unique) - 8-character invitation code (e.g., ABC12345)
  - `type` (text) - Either 'ranch_creation' or 'ranch_member'
  - `license_key_id` (uuid, nullable) - For ranch creation invitations only
  - `ranch_id` (uuid, nullable) - For ranch member invitations only
  - `role` (text, nullable) - Role to assign for ranch member invitations
  - `restricted_email` (text, nullable) - If set, only this email can redeem
  - `expires_at` (timestamptz) - Invitation expiration date
  - `used_at` (timestamptz, nullable) - When invitation was redeemed
  - `used_by_user_id` (uuid, nullable) - Who redeemed the invitation
  - `created_by_user_id` (uuid) - Who created the invitation
  - `created_at` (timestamptz) - When invitation was created
  
  ## Security
  
  ### RLS Policies
  - System admins can create ranch creation invitations
  - Ranch owners/managers can create ranch member invitations
  - All authenticated users can read unexpired invitations they are eligible for
  - Only admins can view all invitations
  
  ## Constraints
  - Invitation codes must be unique
  - Type must be 'ranch_creation' or 'ranch_member'
  - Ranch creation invitations must have license_key_id
  - Ranch member invitations must have ranch_id and role
  - Role must be valid (MANAGER, RANCHHAND, VIEWER, VET)
*/

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('ranch_creation', 'ranch_member')),
  license_key_id uuid REFERENCES license_keys(id) ON DELETE CASCADE,
  ranch_id uuid REFERENCES ranches(id) ON DELETE CASCADE,
  role text CHECK (role IN ('MANAGER', 'RANCHHAND', 'VIEWER', 'VET')),
  restricted_email text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by_user_id uuid REFERENCES auth.users(id),
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  
  -- Ensure ranch creation invitations have license key
  CONSTRAINT ranch_creation_has_license CHECK (
    (type = 'ranch_creation' AND license_key_id IS NOT NULL AND ranch_id IS NULL AND role IS NULL)
    OR type != 'ranch_creation'
  ),
  
  -- Ensure ranch member invitations have ranch and role
  CONSTRAINT ranch_member_has_ranch_and_role CHECK (
    (type = 'ranch_member' AND ranch_id IS NOT NULL AND role IS NOT NULL AND license_key_id IS NULL)
    OR type != 'ranch_member'
  )
);

-- Create index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_ranch_id ON invitations(ranch_id);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policy: System admins can view all invitations
CREATE POLICY "System admins can view all invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Policy: System admins can create ranch creation invitations
CREATE POLICY "System admins can create ranch creation invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    type = 'ranch_creation'
    AND EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Policy: Ranch owners/managers can create ranch member invitations
CREATE POLICY "Ranch owners and managers can create member invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    type = 'ranch_member'
    AND EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = invitations.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );

-- Policy: Users can view unexpired invitations they're eligible for
CREATE POLICY "Users can view eligible invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    used_at IS NULL
    AND expires_at > now()
    AND (
      restricted_email IS NULL
      OR restricted_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Policy: Ranch owners/managers can view their ranch's invitations
CREATE POLICY "Ranch owners can view their ranch invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    type = 'ranch_member'
    AND EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = invitations.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );

-- Policy: Admins and ranch owners can delete invitations
CREATE POLICY "Admins and owners can delete invitations"
  ON invitations FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admins WHERE admins.user_id = auth.uid())
    OR (
      type = 'ranch_member'
      AND EXISTS (
        SELECT 1 FROM user_ranches
        WHERE user_ranches.ranch_id = invitations.ranch_id
        AND user_ranches.user_id = auth.uid()
        AND user_ranches.role IN ('OWNER', 'MANAGER')
      )
    )
  );

-- Policy: System can mark invitations as used (via service role)
CREATE POLICY "System can update invitation usage"
  ON invitations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);