/*
  # Add OWNER Role and Change Default to OWNER
  
  1. Changes
    - Adds OWNER to the allowed roles in user_ranches table
    - Updates existing ADMIN roles to OWNER (for ranch creators)
    - Updates the auto_assign_user_ranch trigger to assign OWNER role instead of ADMIN
  
  2. Reasoning
    - ADMIN authority should be reserved for system-level operations (license key generation)
    - Ranch creators should get OWNER role for ranch management without system admin privileges
    - OWNER role provides full control over their ranch
*/

-- Drop the old constraint
ALTER TABLE user_ranches DROP CONSTRAINT IF EXISTS user_ranches_role_check;

-- Add new constraint with OWNER included
ALTER TABLE user_ranches ADD CONSTRAINT user_ranches_role_check 
  CHECK (role IN ('ADMIN', 'OWNER', 'MANAGER', 'RANCHHAND', 'VIEWER', 'VET'));

-- Update existing ADMIN roles to OWNER
UPDATE user_ranches 
SET role = 'OWNER' 
WHERE role = 'ADMIN';

-- Drop and recreate the trigger function to assign OWNER role
DROP TRIGGER IF EXISTS on_ranch_created ON ranches;
DROP FUNCTION IF EXISTS auto_assign_user_ranch();

CREATE OR REPLACE FUNCTION auto_assign_user_ranch()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically add the user who created the ranch to user_ranches with OWNER role
  INSERT INTO user_ranches (user_id, ranch_id, role)
  VALUES (auth.uid(), NEW.id, 'OWNER');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_ranch_created
  AFTER INSERT ON ranches
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_user_ranch();