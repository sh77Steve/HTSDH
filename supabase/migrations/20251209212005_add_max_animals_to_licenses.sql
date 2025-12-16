/*
  # Add max_animals Enforcement to Licensing System

  ## Overview
  Adds animal count limits to license keys and ranches to enforce tier-based pricing:
  - Small (1-50 head): $10/month
  - Medium (51-150 head): $15/month
  - Large (151-300 head): $25/month
  - Enterprise (300+ head): $40/month

  ## Modified Tables

  ### license_keys (added column)
  - `max_animals` (integer) - Maximum number of animals allowed for this license
    - Demo licenses: 10
    - Small tier: 50
    - Medium tier: 150
    - Large tier: 300
    - Enterprise tier: unlimited (set to 999999)

  ### ranches (added column)
  - `max_animals` (integer) - Maximum animals allowed (copied from activated license key)

  ## Important Notes
  
  1. When a license is activated, max_animals is copied from the key to the ranch
  2. Application logic must check current animal count against max_animals before allowing new additions
  3. Existing ranches without licenses default to NULL (no limit enforcement until licensed)
  4. Demo licenses are limited to 10 animals
*/

-- Add max_animals to license_keys table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'license_keys' AND column_name = 'max_animals'
  ) THEN
    ALTER TABLE license_keys ADD COLUMN max_animals integer NOT NULL DEFAULT 10;
  END IF;
END $$;

-- Add max_animals to ranches table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranches' AND column_name = 'max_animals'
  ) THEN
    ALTER TABLE ranches ADD COLUMN max_animals integer;
  END IF;
END $$;

-- Update existing demo license keys to have 10 animal limit
UPDATE license_keys
SET max_animals = 10
WHERE license_type = 'demo' AND max_animals != 10;

-- Add comment explaining the column
COMMENT ON COLUMN license_keys.max_animals IS 'Maximum number of animals allowed for this license. Demo: 10, Small: 50, Medium: 150, Large: 300, Enterprise: 999999';
COMMENT ON COLUMN ranches.max_animals IS 'Maximum animals allowed (copied from activated license key)';
