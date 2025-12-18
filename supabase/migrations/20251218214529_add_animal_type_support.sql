/*
  # Add Multi-Animal Type Support

  ## Summary
  Adds support for multiple animal types (Cattle, Horses, Sheep, Goats, Pigs, Donkeys)
  to the application while preserving all existing data.

  ## Changes to Animals Table
  1. New Columns:
    - `animal_type` (text, default 'Cattle'): The type of animal
      - Valid values: 'Cattle', 'Horse', 'Sheep', 'Goat', 'Pig', 'Donkey'
      - Existing records will default to 'Cattle' to preserve data integrity

  ## Changes to Ranch Settings Table
  2. New Columns:
    - `default_animal_type` (text, default 'Cattle'): Default type when adding new animals
    - `cattle_adult_age` (numeric, default 2.0): Years until Heifer becomes Cow
    - `horse_adult_age` (numeric, default 4.0): Years until Filly→Mare or Colt→Stallion
    - `sheep_adult_age` (numeric, default 1.0): Standard age for sheep maturity
    - `goat_adult_age` (numeric, default 1.0): Standard age for goat maturity
    - `pig_adult_age` (numeric, default 0.75): Standard age for pig maturity

  ## Changes to Drugs Table
  3. New Columns:
    - `animal_type` (text, default 'Cattle'): The animal type this drug is for
      - Existing drugs will default to 'Cattle'
      - When using injection feature, drugs are filtered by animal's type

  ## Important Notes
  1. All existing animal records are preserved and set to type 'Cattle'
  2. All existing drug records are preserved and set to type 'Cattle'
  3. Age thresholds use industry-standard best practices
  4. Auto-promotion only applies to: Heifer→Cow, Filly→Mare, Colt→Stallion
  5. Other sex transitions (Lamb, Kid, Piglet) require manual updates
*/

-- Add animal_type column to animals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animals' AND column_name = 'animal_type'
  ) THEN
    ALTER TABLE animals ADD COLUMN animal_type text DEFAULT 'Cattle' NOT NULL;

    -- Add check constraint for valid animal types
    ALTER TABLE animals ADD CONSTRAINT animals_animal_type_check
      CHECK (animal_type IN ('Cattle', 'Horse', 'Sheep', 'Goat', 'Pig', 'Donkey'));
  END IF;
END $$;

-- Add animal type settings to ranch_settings table
DO $$
BEGIN
  -- Default animal type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranch_settings' AND column_name = 'default_animal_type'
  ) THEN
    ALTER TABLE ranch_settings ADD COLUMN default_animal_type text DEFAULT 'Cattle' NOT NULL;
    ALTER TABLE ranch_settings ADD CONSTRAINT ranch_settings_default_animal_type_check
      CHECK (default_animal_type IN ('Cattle', 'Horse', 'Sheep', 'Goat', 'Pig', 'Donkey'));
  END IF;

  -- Age thresholds for each animal type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranch_settings' AND column_name = 'cattle_adult_age'
  ) THEN
    ALTER TABLE ranch_settings ADD COLUMN cattle_adult_age numeric DEFAULT 2.0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranch_settings' AND column_name = 'horse_adult_age'
  ) THEN
    ALTER TABLE ranch_settings ADD COLUMN horse_adult_age numeric DEFAULT 4.0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranch_settings' AND column_name = 'sheep_adult_age'
  ) THEN
    ALTER TABLE ranch_settings ADD COLUMN sheep_adult_age numeric DEFAULT 1.0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranch_settings' AND column_name = 'goat_adult_age'
  ) THEN
    ALTER TABLE ranch_settings ADD COLUMN goat_adult_age numeric DEFAULT 1.0 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranch_settings' AND column_name = 'pig_adult_age'
  ) THEN
    ALTER TABLE ranch_settings ADD COLUMN pig_adult_age numeric DEFAULT 0.75 NOT NULL;
  END IF;
END $$;

-- Add animal_type column to drugs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drugs' AND column_name = 'animal_type'
  ) THEN
    ALTER TABLE drugs ADD COLUMN animal_type text DEFAULT 'Cattle' NOT NULL;

    -- Add check constraint for valid animal types
    ALTER TABLE drugs ADD CONSTRAINT drugs_animal_type_check
      CHECK (animal_type IN ('Cattle', 'Horse', 'Sheep', 'Goat', 'Pig', 'Donkey'));
  END IF;
END $$;

-- Create index on animal_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_animals_animal_type ON animals(animal_type);
CREATE INDEX IF NOT EXISTS idx_drugs_animal_type ON drugs(animal_type);
