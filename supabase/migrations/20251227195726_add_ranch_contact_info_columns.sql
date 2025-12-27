/*
  # Add Contact Information to Ranches

  1. Changes
    - Add `contact_name` column to ranches table for storing primary contact name
    - Add `contact_email` column to ranches table for storing primary contact email
    - Add `contact_phone` column to ranches table for storing primary contact phone number
  
  2. Notes
    - All columns are optional (nullable) as not all ranches may have this information immediately
    - These fields are used for support communication and license management
*/

-- Add contact information columns to ranches table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranches' AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE ranches ADD COLUMN contact_name text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranches' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE ranches ADD COLUMN contact_email text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranches' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE ranches ADD COLUMN contact_phone text;
  END IF;
END $$;
