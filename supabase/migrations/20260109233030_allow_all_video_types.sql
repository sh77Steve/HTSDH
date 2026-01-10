/*
  # Allow All Video Types in Storage

  1. Changes
    - Add support for multiple video formats (mp4, mov, avi, webm, quicktime)
    - Ensures compatibility with various video file formats
  
  2. Security
    - Maintains existing access controls
    - Public read access for viewing
*/

-- Update the animal-photos bucket to allow multiple video formats
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY[
    'image/jpeg', 
    'image/jpg', 
    'image/png', 
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/avi'
  ]::text[]
WHERE id = 'animal-photos';