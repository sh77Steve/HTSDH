/*
  # Add Sale Price field to animals table

  1. Changes
    - Add `sale_price` column to `animals` table
      - Type: numeric(10,2) for dollar amounts with 2 decimal places
      - Nullable: true (optional field)
      - Default: null
  
  2. Purpose
    - Track individual sale prices for sold animals
    - Can be entered manually or automatically via Prorate Sale feature
    - Used in Sales History reports to show individual prices and totals
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'animals' AND column_name = 'sale_price'
  ) THEN
    ALTER TABLE animals ADD COLUMN sale_price NUMERIC(10,2) DEFAULT NULL;
  END IF;
END $$;
