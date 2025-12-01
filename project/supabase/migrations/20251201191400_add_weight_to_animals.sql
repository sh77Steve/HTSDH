/*
  # Add Weight Field to Animals

  1. Changes
    - Add `weight_lbs` column to `animals` table
      - Type: numeric (allows decimal values)
      - Optional field (nullable)
      - No default value

  2. Notes
    - Weight is stored in pounds (lbs)
    - Field is optional and can be updated at any time
    - Users can track weight changes via medical history notes if detailed tracking is needed
*/

-- Add weight column to animals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'weight_lbs'
  ) THEN
    ALTER TABLE animals ADD COLUMN weight_lbs numeric(8,2);
  END IF;
END $$;