/*
  # Add Father Tracking and Print Program Setting

  ## Summary
  This migration adds missing features from the original HTSDH Bovine Database V1:
  1. Father/sire tracking for animals (genealogy)
  2. Print program configuration in ranch settings

  ## Changes Made

  ### 1. Animals Table
  - Add `father_id` column to track the sire (father) of each animal
  - References animals(id) for male animals (BULL, STEER)
  - Allows NULL (not all animals have known fathers)

  ### 2. Ranch Settings Table
  - Add `print_program` column to store the preferred print/export program path
  - Defaults to empty string (user can configure later)

  ### 3. Index Creation
  - Add index on father_id for performance when querying offspring by sire

  ## Important Notes
  - Uses IF NOT EXISTS checks to prevent errors if fields already exist
  - Father field will be NULL for existing animals (can be updated later)
  - Print program setting is optional and defaults to empty string
*/

-- Add father_id column to animals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'father_id'
  ) THEN
    ALTER TABLE animals ADD COLUMN father_id uuid REFERENCES animals(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add print_program column to ranch_settings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranch_settings' AND column_name = 'print_program'
  ) THEN
    ALTER TABLE ranch_settings ADD COLUMN print_program text DEFAULT '';
  END IF;
END $$;

-- Create index on father_id for performance
CREATE INDEX IF NOT EXISTS idx_animals_father_id ON animals(father_id);