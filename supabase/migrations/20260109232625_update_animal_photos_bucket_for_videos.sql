/*
  # Update Animal Photos Bucket to Support Videos

  1. Changes
    - Add video/mp4 to allowed MIME types for the animal-photos bucket
    - Increase file size limit from 5MB to 100MB to accommodate video files
  
  2. Security
    - Maintains existing public read access
    - Upload/delete still restricted to authenticated ranch members via existing policies
*/

-- Update the animal-photos bucket to allow video uploads
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4']::text[],
  file_size_limit = 104857600
WHERE id = 'animal-photos';