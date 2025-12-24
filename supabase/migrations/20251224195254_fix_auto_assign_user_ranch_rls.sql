/*
  # Fix auto_assign_user_ranch Function RLS
  
  1. Problem
    - The trigger function auto_assign_user_ranch() is SECURITY DEFINER but doesn't disable RLS
    - When it tries to insert into user_ranches, it still hits the RLS policies
    - This causes the entire ranch creation to fail with "violates row-level security policy"
    
  2. Solution
    - Add SET row_security TO 'off' to the function
    - This allows the trigger to bypass RLS when adding the creator to user_ranches
    - The function is already SECURITY DEFINER so it's safe to do this
*/

-- Recreate the function with row_security disabled
CREATE OR REPLACE FUNCTION auto_assign_user_ranch()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically add the user who created the ranch to user_ranches with OWNER role
  INSERT INTO user_ranches (user_id, ranch_id, role)
  VALUES (auth.uid(), NEW.id, 'OWNER');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET row_security = off;
