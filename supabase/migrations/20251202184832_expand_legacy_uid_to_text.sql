/*
  # Expand legacy_uid to support longer identifiers

  ## Changes
  
  1. Modifications
    - Expand `animals.legacy_uid` from varchar(6) to text
    - This allows importing RanchR Primary IDs which can be longer than 6 characters
    - Examples: "42p (Lefty)", "012 & 013 new calf", "0025newcalf"
  
  ## Important Notes
  
  - Non-destructive change: varchar(6) data automatically converts to text
  - Existing data preserved
  - Index on legacy_uid remains functional
*/

-- Expand legacy_uid column to support longer identifiers from RanchR
ALTER TABLE animals 
  ALTER COLUMN legacy_uid TYPE text;