/*
  # Fix Ranch Triggers to Work with Service Role
  
  1. Problem
    - Edge functions use service role client to create ranches
    - Triggers use auth.uid() which returns NULL with service role
    - This causes NULL constraint violations in user_ranches table
    
  2. Solution
    - Modify add_ranch_owner function to use created_by field if auth.uid() is NULL
    - This allows edge functions to set created_by explicitly
    - Fallback to auth.uid() for regular user-created ranches
    
  3. Changes
    - Update add_ranch_owner() function to check created_by first
    - Only insert into user_ranches if we have a valid user_id
*/

-- Update the AFTER trigger function to use created_by when auth.uid() is NULL
CREATE OR REPLACE FUNCTION add_ranch_owner()
RETURNS TRIGGER
SECURITY DEFINER
SET row_security TO 'off'
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Use created_by if available, otherwise fall back to auth.uid()
  target_user_id := COALESCE(NEW.created_by, auth.uid());
  
  -- Only insert if we have a valid user_id
  IF target_user_id IS NOT NULL THEN
    INSERT INTO user_ranches (user_id, ranch_id, role)
    VALUES (target_user_id, NEW.id, 'owner')
    ON CONFLICT (user_id, ranch_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
