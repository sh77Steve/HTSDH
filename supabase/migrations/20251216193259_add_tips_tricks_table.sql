/*
  # Tips & Tricks Feature

  1. New Tables
    - `tips_tricks`
      - `id` (uuid, primary key) - Single row identified by constant UUID
      - `content` (text) - Plain text content of tips & tricks
      - `updated_at` (timestamptz) - Last update timestamp
      - `updated_by` (uuid, foreign key to auth.users) - Admin who last updated
  
  2. Security
    - Enable RLS on `tips_tricks` table
    - Add policy for all authenticated users to read
    - Add policy for admins to update content
  
  3. Notes
    - This is a single-row table for storing global tips & tricks content
    - Only admins can update the content
    - All authenticated users can read it
*/

-- Create tips_tricks table
CREATE TABLE IF NOT EXISTS tips_tricks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE tips_tricks ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read tips & tricks
CREATE POLICY "Authenticated users can read tips & tricks"
  ON tips_tricks
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can update tips & tricks
CREATE POLICY "Admins can update tips & tricks"
  ON tips_tricks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'admin'
    )
  );

-- Policy: Only admins can insert tips & tricks
CREATE POLICY "Admins can insert tips & tricks"
  ON tips_tricks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'admin'
    )
  );

-- Insert initial empty tips & tricks row
INSERT INTO tips_tricks (id, content) 
VALUES ('00000000-0000-0000-0000-000000000001', 'No tips & tricks have been uploaded yet.')
ON CONFLICT (id) DO NOTHING;