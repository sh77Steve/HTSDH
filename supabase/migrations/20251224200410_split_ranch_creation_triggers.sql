/*
  # Split Ranch Creation Into Two Triggers
  
  1. Problem
    - BEFORE trigger tries to insert into user_ranches
    - But ranch doesn't exist yet (foreign key violation)
    
  2. Solution
    - BEFORE trigger: Only set created_by field
    - AFTER trigger: Insert into user_ranches (ranch exists now)
*/

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_ranch_created ON ranches;

-- Create function for BEFORE trigger (only sets created_by)
CREATE OR REPLACE FUNCTION set_ranch_creator()
RETURNS TRIGGER
SECURITY DEFINER
SET row_security TO 'off'
AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function for AFTER trigger (inserts into user_ranches)
CREATE OR REPLACE FUNCTION add_ranch_owner()
RETURNS TRIGGER
SECURITY DEFINER
SET row_security TO 'off'
AS $$
BEGIN
  INSERT INTO user_ranches (user_id, ranch_id, role)
  VALUES (auth.uid(), NEW.id, 'OWNER');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create BEFORE trigger to set created_by
CREATE TRIGGER set_ranch_creator_trigger
  BEFORE INSERT ON ranches
  FOR EACH ROW
  EXECUTE FUNCTION set_ranch_creator();

-- Create AFTER trigger to add to user_ranches
CREATE TRIGGER add_ranch_owner_trigger
  AFTER INSERT ON ranches
  FOR EACH ROW
  EXECUTE FUNCTION add_ranch_owner();
