/*
  # Add file size tracking to animal photos

  1. Changes
    - Add `file_size_bytes` column to `animal_photos` table
    - This will store actual file size when photos are uploaded
    - Allows accurate storage monitoring without Storage API calls
    
  2. Notes
    - Existing photos will have NULL file_size_bytes
    - New uploads will populate this field
    - Use this for accurate storage reporting and capacity planning
*/

-- Add file size tracking column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animal_photos' AND column_name = 'file_size_bytes'
  ) THEN
    ALTER TABLE animal_photos ADD COLUMN file_size_bytes bigint DEFAULT NULL;
  END IF;
END $$;

-- Add index for storage reporting queries
CREATE INDEX IF NOT EXISTS idx_animal_photos_file_size ON animal_photos(ranch_id, file_size_bytes) WHERE file_size_bytes IS NOT NULL;