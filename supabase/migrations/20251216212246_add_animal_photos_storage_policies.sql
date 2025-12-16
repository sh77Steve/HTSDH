/*
  # Add Storage Policies for Animal Photos

  1. Storage Policies
    - Allow authenticated users to upload photos to their ranch folders
    - Allow authenticated users to view photos from their ranch folders
    - Allow authenticated users to delete photos from their ranch folders
    - Policies verify ranch membership via user_ranches table
  
  2. Security
    - All policies check that user is a member of the ranch (via user_ranches)
    - Photos are organized by ranch_id/animal_id folder structure
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload photos to their ranch" ON storage.objects;
DROP POLICY IF EXISTS "Users can view photos from their ranch" ON storage.objects;
DROP POLICY IF EXISTS "Users can update photos from their ranch" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete photos from their ranch" ON storage.objects;

-- Policy: Authenticated users can upload photos to their ranch
CREATE POLICY "Users can upload photos to their ranch"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'animal-photos' AND
  (string_to_array(name, '/'))[1] IN (
    SELECT ranch_id::text 
    FROM user_ranches 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Authenticated users can view photos from their ranch
CREATE POLICY "Users can view photos from their ranch"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'animal-photos' AND
  (string_to_array(name, '/'))[1] IN (
    SELECT ranch_id::text 
    FROM user_ranches 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Authenticated users can update photos from their ranch
CREATE POLICY "Users can update photos from their ranch"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'animal-photos' AND
  (string_to_array(name, '/'))[1] IN (
    SELECT ranch_id::text 
    FROM user_ranches 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'animal-photos' AND
  (string_to_array(name, '/'))[1] IN (
    SELECT ranch_id::text 
    FROM user_ranches 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Authenticated users can delete photos from their ranch
CREATE POLICY "Users can delete photos from their ranch"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'animal-photos' AND
  (string_to_array(name, '/'))[1] IN (
    SELECT ranch_id::text 
    FROM user_ranches 
    WHERE user_id = auth.uid()
  )
);