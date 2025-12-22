/*
  # Remove Restrictive Sex Constraint

  ## Problem
  The animals table has a CHECK constraint limiting sex values to cattle-only terms:
  'BULL', 'STEER', 'HEIFER'. This prevents adding other animal types (pigs, horses, sheep, goats)
  which have different sex terminology.

  ## Changes
  1. Drop the existing CHECK constraint on the sex column
  2. The application layer already validates sex values based on animal type via animalTypes.ts
  
  ## Sex Values by Animal Type (for reference)
  - Cattle: Bull, Steer, Cow, Heifer
  - Pig: Boar, Barrow, Sow, Gilt, Piglet
  - Horse: Stallion, Gelding, Mare, Filly, Colt
  - Sheep: Ram, Wether, Ewe, Lamb
  - Goat: Buck, Wether, Doe, Kid
  - Donkey: Stallion, Gelding, Mare, Filly, Colt
*/

-- Drop the existing check constraint
ALTER TABLE animals DROP CONSTRAINT IF EXISTS animals_sex_check;
