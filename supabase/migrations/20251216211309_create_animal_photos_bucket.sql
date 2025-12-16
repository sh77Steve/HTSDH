/*
  # Create Animal Photos Storage Bucket

  1. Storage Bucket
    - Creates 'animal-photos' bucket for storing animal photos
    - Public bucket (allows public URL access for viewing photos)
  
  2. Security
    - Bucket policies will restrict upload/delete to authenticated ranch members
    - Public read access enabled for viewing photos
*/

-- Create the animal-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'animal-photos', 
  'animal-photos', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif']::text[];