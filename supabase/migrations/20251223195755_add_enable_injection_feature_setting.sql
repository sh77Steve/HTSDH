/*
  # Add injection feature toggle to ranch settings

  1. Changes
    - Add `enable_injection_feature` column to `ranch_settings` table
      - Type: boolean
      - Default: false
      - Not null
  
  2. Purpose
    - Allows ranches to opt-in to the injection/medication feature
    - Defaults to disabled for safety
    - Users must accept disclaimer before enabling
*/

-- Add enable_injection_feature column to ranch_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranch_settings' AND column_name = 'enable_injection_feature'
  ) THEN
    ALTER TABLE ranch_settings ADD COLUMN enable_injection_feature boolean DEFAULT false NOT NULL;
  END IF;
END $$;