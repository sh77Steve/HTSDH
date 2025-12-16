/*
  # Add Automatic User Ranch Assignment

  1. Problem
    - When a user creates a ranch, the INSERT succeeds
    - But the subsequent SELECT fails because the user isn't in user_ranches yet
    - The SELECT policy requires the user to be in user_ranches to view the ranch
    
  2. Solution
    - Create a trigger that automatically adds the creating user to user_ranches as ADMIN
    - This happens atomically when the ranch is created
    - The user can then immediately view their newly created ranch
    
  3. Security
    - The trigger uses auth.uid() to get the current user
    - Only runs when a ranch is created, not updated
    - Automatically grants ADMIN role to the creator
*/

-- Create function to automatically add creator to user_ranches
CREATE OR REPLACE FUNCTION add_creator_to_user_ranches()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the creating user as an ADMIN of the new ranch
  INSERT INTO user_ranches (user_id, ranch_id, role)
  VALUES (auth.uid(), NEW.id, 'ADMIN');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET row_security = off;

-- Create trigger to run after ranch insert
DROP TRIGGER IF EXISTS add_creator_to_user_ranches_trigger ON ranches;
CREATE TRIGGER add_creator_to_user_ranches_trigger
  AFTER INSERT ON ranches
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_to_user_ranches();
