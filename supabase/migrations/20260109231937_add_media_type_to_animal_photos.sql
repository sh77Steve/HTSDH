/*
  # Add media_type column to animal_photos table

  1. Changes
    - Add `media_type` column to `animal_photos` table to distinguish between images and videos
    - Set default value to 'image' for backwards compatibility
    - Allowed values: 'image' or 'video'
  
  2. Notes
    - Existing rows will automatically get 'image' as the media_type
    - This enables video upload and proper rendering in the gallery
*/

-- Add media_type column to animal_photos table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animal_photos' AND column_name = 'media_type'
  ) THEN
    ALTER TABLE animal_photos ADD COLUMN media_type text DEFAULT 'image' CHECK (media_type IN ('image', 'video'));
  END IF;
END $$;