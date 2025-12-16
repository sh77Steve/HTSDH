/*
  # Add Sale Price Field to Animals

  1. Changes
    - Adds `sale_price` column to `animals` table
    - Optional decimal field for tracking sale price per animal
    - Can be entered manually or auto-populated via prorate sale feature
  
  2. Notes
    - Uses ALTER TABLE to safely add the column without data loss
    - Nullable field since not all animals will have a sale price
    - Uses numeric type for precise currency handling
*/

-- Add sale_price column to animals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'sale_price'
  ) THEN
    ALTER TABLE animals ADD COLUMN sale_price numeric(10, 2);
  END IF;
END $$;