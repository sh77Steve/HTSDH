/*
  # Revert Video and Document Support

  1. Changes
    - Remove media_type column from animal_photos table
    - Update storage bucket policies to only allow image files
    - Remove support for video and document uploads
  
  2. Security
    - Restore original RLS policies for image-only uploads
    - Maintain existing file size limits for images
*/

-- Remove media_type column from animal_photos table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animal_photos' AND column_name = 'media_type'
  ) THEN
    ALTER TABLE animal_photos DROP COLUMN media_type;
  END IF;
END $$;

-- Drop existing upload policy to recreate with image-only support
DROP POLICY IF EXISTS "Allow authenticated uploads to animal-photos" ON storage.objects;

-- Recreate policy with only image MIME types
CREATE POLICY "Allow authenticated uploads to animal-photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'animal-photos'
  AND (
    -- Only image formats
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM animals
    )
    AND LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic', 'heif')
  )
  AND (storage.foldername(name))[1] IN (
    SELECT a.id::text 
    FROM animals a
    JOIN user_ranches ur ON ur.ranch_id = a.ranch_id
    WHERE ur.user_id = auth.uid()
  )
);