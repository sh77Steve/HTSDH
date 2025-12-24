/*
  # Fix Ranch Creation Trigger Timing
  
  1. Problem
    - The auto_assign_user_ranch trigger fires AFTER INSERT
    - When Supabase returns the inserted row, it checks the SELECT policy
    - The SELECT policy checks if created_by = auth.uid()
    - But created_by is NULL because the INSERT didn't set it
    - The AFTER trigger hasn't run yet (or is in same transaction)
    
  2. Solution
    - Change trigger to BEFORE INSERT
    - This sets created_by BEFORE the row is inserted
    - When the row is returned, created_by matches auth.uid()
    - The user_ranches entry is still inserted in the trigger
*/

-- Drop the existing AFTER trigger
DROP TRIGGER IF EXISTS on_ranch_created ON ranches;

-- Recreate as BEFORE trigger
CREATE TRIGGER on_ranch_created
  BEFORE INSERT ON ranches
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_user_ranch();
