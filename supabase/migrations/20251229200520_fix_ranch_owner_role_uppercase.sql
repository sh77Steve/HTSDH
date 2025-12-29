/*
  # Fix Ranch Owner Role to Use Uppercase
  
  1. Problem
    - The add_ranch_owner trigger function inserts role as lowercase 'owner'
    - The check constraint expects uppercase 'OWNER'
    - This causes "check constraint violation" errors when creating ranches
    
  2. Solution
    - Update the add_ranch_owner function to insert 'OWNER' (uppercase)
    
  3. Changes
    - Recreate add_ranch_owner() function with uppercase 'OWNER'
*/

-- Update the AFTER trigger function to use uppercase 'OWNER'
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
    VALUES (target_user_id, NEW.id, 'OWNER')
    ON CONFLICT (user_id, ranch_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
