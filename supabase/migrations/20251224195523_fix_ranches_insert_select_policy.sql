/*
  # Fix Ranches INSERT and SELECT Policy Interaction
  
  1. Problem
    - When a user inserts a ranch, the INSERT succeeds
    - But when Supabase tries to return the new row, it checks the SELECT policy
    - The SELECT policy requires the user to be in user_ranches
    - The trigger hasn't committed yet, so user_ranches doesn't have the entry
    - Result: "New row violates row-level security policy"
    
  2. Solution
    - Modify the SELECT policy to also allow viewing ranches the user created
    - This uses created_by column (if it exists) or we check if the INSERT just happened
    - Actually, simpler: just allow RETURNING clause by checking auth.uid() matches something
    
  3. Actual Solution
    - Add created_by column to ranches if it doesn't exist
    - Update the trigger to set created_by
    - Update SELECT policy to allow viewing ranches you created OR are a member of
*/

-- Add created_by column to ranches if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranches' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE ranches ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Update the auto_assign trigger to also set created_by
CREATE OR REPLACE FUNCTION auto_assign_user_ranch()
RETURNS TRIGGER AS $$
BEGIN
  -- Set the created_by field
  NEW.created_by := auth.uid();
  
  -- Automatically add the user who created the ranch to user_ranches with OWNER role
  INSERT INTO user_ranches (user_id, ranch_id, role)
  VALUES (auth.uid(), NEW.id, 'OWNER');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET row_security = off;

-- Update the SELECT policy to allow viewing ranches you created OR are a member of
DROP POLICY IF EXISTS "Users can view ranches they belong to" ON ranches;

CREATE POLICY "Users can view ranches they belong to"
  ON ranches
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR 
    id IN (
      SELECT user_ranches.ranch_id
      FROM user_ranches
      WHERE user_ranches.user_id = auth.uid()
    )
  );
