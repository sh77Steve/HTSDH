/*
  # Create fences table
  
  1. New Tables
    - `fences`
      - `id` (uuid, primary key) - Unique identifier for each fence
      - `ranch_id` (uuid, foreign key) - Links fence to a specific ranch
      - `description` (text) - Description of the fence
      - `last_checked_date` (date, nullable) - Date when the fence was last checked
      - `last_checked_by` (text, nullable) - Name of the person who last checked the fence
      - `created_at` (timestamptz) - Timestamp of when the fence was added
  
  2. Security
    - Enable RLS on `fences` table
    - Add policies for authenticated users to manage fences in their ranches:
      - Owners and managers can view, insert, update, and delete fences
      - Viewers can only view fences
      - Admins can view all fences
*/

CREATE TABLE IF NOT EXISTS fences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ranch_id uuid REFERENCES ranches(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  last_checked_date date,
  last_checked_by text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fences ENABLE ROW LEVEL SECURITY;

-- Policy for owners and managers to select fences
CREATE POLICY "Owners and managers can view fences"
  ON fences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = fences.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );

-- Policy for viewers to select fences
CREATE POLICY "Viewers can view fences"
  ON fences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = fences.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'VIEWER'
    )
  );

-- Policy for admins to view all fences
CREATE POLICY "Admins can view all fences"
  ON fences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Policy for owners and managers to insert fences
CREATE POLICY "Owners and managers can insert fences"
  ON fences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = fences.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );

-- Policy for owners and managers to update fences
CREATE POLICY "Owners and managers can update fences"
  ON fences
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = fences.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = fences.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );

-- Policy for owners and managers to delete fences
CREATE POLICY "Owners and managers can delete fences"
  ON fences
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = fences.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );