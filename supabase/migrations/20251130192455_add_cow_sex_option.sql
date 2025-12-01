/*
  # Add COW as a sex option
  
  1. Changes
    - Adds 'COW' to the animal_sex enum type
    - This allows female breeding cattle to be properly categorized
  
  2. Notes
    - Uses ALTER TYPE to add the new enum value
    - Safe operation that doesn't affect existing data
*/

-- Add COW to animal_sex enum
ALTER TYPE animal_sex ADD VALUE IF NOT EXISTS 'COW';
