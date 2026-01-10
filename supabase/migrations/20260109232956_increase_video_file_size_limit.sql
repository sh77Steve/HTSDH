/*
  # Increase File Size Limit for Videos

  1. Changes
    - Increase file size limit from 100MB to 1GB (1073741824 bytes) to accommodate large video files
  
  2. Notes
    - User confirmed storage costs are not a concern
    - Allows videos up to 1GB in size
*/

-- Update the animal-photos bucket to allow larger video files
UPDATE storage.buckets
SET 
  file_size_limit = 1073741824
WHERE id = 'animal-photos';