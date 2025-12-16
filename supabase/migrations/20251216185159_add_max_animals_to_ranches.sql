/*
  # Add max_animals column to ranches table

  1. Changes
    - Add `max_animals` column to ranches table for license management
  
  2. Notes
    - This column tracks the maximum number of animals allowed by the ranch's license
    - Default value of 50 matches the trial/basic license tier
*/

-- Add max_animals column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranches' AND column_name = 'max_animals'
  ) THEN
    ALTER TABLE ranches ADD COLUMN max_animals integer DEFAULT 50;
  END IF;
END $$;