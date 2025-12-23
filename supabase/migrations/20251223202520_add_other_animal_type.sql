/*
  # Add 'Other' Animal Type

  ## Changes

  1. Updates to Animals Table:
    - Adds 'Other' to the valid animal_type values
    - Allows for storing non-traditional animals, ranch photos, family photos, etc.

  2. Updates to Ranch Settings Table:
    - Adds 'Other' to the valid default_animal_type values

  3. Updates to Drugs Table:
    - Adds 'Other' to the valid animal_type values

  ## Notes
    - The 'Other' animal type is intended for miscellaneous entries like:
      - Ranch photographs
      - Family photographs
      - Pet animals (dogs, cats, etc.)
      - Any other non-traditional livestock
*/

-- Update animals table constraint to include 'Other'
DO $$
BEGIN
  -- Drop the old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'animals_animal_type_check'
  ) THEN
    ALTER TABLE animals DROP CONSTRAINT animals_animal_type_check;
  END IF;

  -- Add the new constraint with 'Other' included
  ALTER TABLE animals ADD CONSTRAINT animals_animal_type_check
    CHECK (animal_type IN ('Cattle', 'Horse', 'Sheep', 'Goat', 'Pig', 'Donkey', 'Other'));
END $$;

-- Update ranch_settings table constraint to include 'Other'
DO $$
BEGIN
  -- Drop the old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ranch_settings_default_animal_type_check'
  ) THEN
    ALTER TABLE ranch_settings DROP CONSTRAINT ranch_settings_default_animal_type_check;
  END IF;

  -- Add the new constraint with 'Other' included
  ALTER TABLE ranch_settings ADD CONSTRAINT ranch_settings_default_animal_type_check
    CHECK (default_animal_type IN ('Cattle', 'Horse', 'Sheep', 'Goat', 'Pig', 'Donkey', 'Other'));
END $$;

-- Update drugs table constraint to include 'Other'
DO $$
BEGIN
  -- Drop the old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'drugs_animal_type_check'
  ) THEN
    ALTER TABLE drugs DROP CONSTRAINT drugs_animal_type_check;
  END IF;

  -- Add the new constraint with 'Other' included
  ALTER TABLE drugs ADD CONSTRAINT drugs_animal_type_check
    CHECK (animal_type IN ('Cattle', 'Horse', 'Sheep', 'Goat', 'Pig', 'Donkey', 'Other'));
END $$;