/*
  # Add Drugs Table

  1. New Tables
    - `drugs`
      - `id` (uuid, primary key) - Unique identifier for each drug
      - `ranch_id` (uuid, foreign key) - Links to ranches table
      - `drug_name` (text) - Name of the drug
      - `ccs_per_pound` (numeric, nullable) - Dosage in ml per pound of body weight
      - `fixed_dose_ml` (numeric, nullable) - Fixed dosage in ml regardless of weight
      - `notes` (text, nullable) - Administration notes (e.g., "Intramuscular")
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record last update timestamp

  2. Security
    - Enable RLS on `drugs` table
    - Add policy for ranch members to view their ranch's drugs
    - Add policy for ranch members to insert drugs for their ranch
    - Add policy for ranch members to update their ranch's drugs
    - Add policy for ranch members to delete their ranch's drugs

  3. Notes
    - Either `ccs_per_pound` OR `fixed_dose_ml` should be set (not both)
    - Drug names should be unique per ranch
*/

CREATE TABLE IF NOT EXISTS drugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ranch_id uuid NOT NULL REFERENCES ranches(id) ON DELETE CASCADE,
  drug_name text NOT NULL,
  ccs_per_pound numeric(10, 4),
  fixed_dose_ml numeric(10, 2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ranch_id, drug_name)
);

ALTER TABLE drugs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ranch members can view their ranch drugs"
  ON drugs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = drugs.ranch_id
      AND user_ranches.user_id = auth.uid()
    )
  );

CREATE POLICY "Ranch members can insert drugs for their ranch"
  ON drugs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = drugs.ranch_id
      AND user_ranches.user_id = auth.uid()
    )
  );

CREATE POLICY "Ranch members can update their ranch drugs"
  ON drugs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = drugs.ranch_id
      AND user_ranches.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = drugs.ranch_id
      AND user_ranches.user_id = auth.uid()
    )
  );

CREATE POLICY "Ranch members can delete their ranch drugs"
  ON drugs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = drugs.ranch_id
      AND user_ranches.user_id = auth.uid()
    )
  );