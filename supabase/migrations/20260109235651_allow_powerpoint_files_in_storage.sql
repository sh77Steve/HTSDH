/*
  # Allow PowerPoint Files in Animal Photos Storage

  1. Changes
    - Update storage bucket policy to allow PowerPoint MIME types
    - Supports both .ppt and .pptx formats
    - Maintains existing image and video support
  
  2. Security
    - Keeps existing file size limit of 500MB
    - Maintains RLS policies for upload/access
*/

-- Drop existing policy to recreate with PowerPoint support
DROP POLICY IF EXISTS "Allow authenticated uploads to animal-photos" ON storage.objects;

-- Recreate policy with PowerPoint MIME types included
CREATE POLICY "Allow authenticated uploads to animal-photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'animal-photos'
  AND (
    -- Images
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM animals
    )
    AND (
      -- Image formats
      LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic', 'heif')
      -- Video formats
      OR LOWER(storage.extension(name)) IN ('mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v', '3gp', 'mpeg', 'mpg')
      -- Document formats (PowerPoint)
      OR LOWER(storage.extension(name)) IN ('ppt', 'pptx')
    )
  )
  AND (storage.foldername(name))[1] IN (
    SELECT a.id::text 
    FROM animals a
    JOIN user_ranches ur ON ur.ranch_id = a.ranch_id
    WHERE ur.user_id = auth.uid()
  )
);