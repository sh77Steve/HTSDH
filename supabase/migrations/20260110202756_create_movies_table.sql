/*
  # Create movies table
  
  1. New Tables
    - `movies`
      - `id` (uuid, primary key) - Unique identifier for each movie
      - `ranch_id` (uuid, foreign key) - Links movie to a specific ranch
      - `movie_name` (text) - Name of the movie
      - `rating` (text) - Movie rating (A, B, or C)
      - `genre` (text) - Genre code (W=Western, C=Comedy, A=Action/Suspense, S=Science Fiction, D=Drama, O=Other)
      - `actor` (text) - Main actor(s) in the movie
      - `notes` (text) - Additional notes about the movie
      - `folder` (text, nullable) - Folder code for physical location
      - `created_at` (timestamptz) - Timestamp of when the movie was added
  
  2. Security
    - Enable RLS on `movies` table
    - Add policies for authenticated users to manage movies in their ranches:
      - Owners and managers can view, insert, update, and delete movies
      - Viewers can only view movies
      - Admins can view all movies
*/

CREATE TABLE IF NOT EXISTS movies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ranch_id uuid REFERENCES ranches(id) ON DELETE CASCADE NOT NULL,
  movie_name text NOT NULL,
  rating text,
  genre text,
  actor text,
  notes text,
  folder text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

-- Policy for owners and managers to select movies
CREATE POLICY "Owners and managers can view movies"
  ON movies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = movies.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );

-- Policy for viewers to select movies
CREATE POLICY "Viewers can view movies"
  ON movies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = movies.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'VIEWER'
    )
  );

-- Policy for admins to view all movies
CREATE POLICY "Admins can view all movies"
  ON movies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
    )
  );

-- Policy for owners and managers to insert movies
CREATE POLICY "Owners and managers can insert movies"
  ON movies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = movies.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );

-- Policy for owners and managers to update movies
CREATE POLICY "Owners and managers can update movies"
  ON movies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = movies.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = movies.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );

-- Policy for owners and managers to delete movies
CREATE POLICY "Owners and managers can delete movies"
  ON movies
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = movies.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('OWNER', 'MANAGER')
    )
  );