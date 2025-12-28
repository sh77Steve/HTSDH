/*
  # Add print_program column to ranch_settings

  1. Changes
    - Add `print_program` column to `ranch_settings` table
      - Type: text (nullable)
      - Purpose: Store path to custom print/export program
      - Default: NULL (optional field)

  2. Notes
    - This column allows users to specify a custom program path for printing or opening exported reports
    - The field is optional and can be left blank
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ranch_settings'
    AND column_name = 'print_program'
  ) THEN
    ALTER TABLE ranch_settings ADD COLUMN print_program text;
  END IF;
END $$;
