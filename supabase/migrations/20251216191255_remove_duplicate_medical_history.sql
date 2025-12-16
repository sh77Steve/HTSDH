/*
  # Remove Duplicate Medical History Records

  This migration removes duplicate medical history entries that were created during import.
  
  1. Changes
    - Identifies and removes duplicate medical_history records
    - Keeps only one record for each unique (animal_id, date, description) combination
    
  2. Notes
    - Does not affect unique records
    - Preserves all data, just removes exact duplicates
*/

-- Remove duplicate medical history records, keeping only one per unique combination
DELETE FROM medical_history
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY animal_id, date, description, ranch_id 
             ORDER BY created_at
           ) as rn
    FROM medical_history
  ) sub
  WHERE rn > 1
);