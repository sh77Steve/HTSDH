/*
  # Add service role policy for user_ranches

  1. Changes
    - Add policy to allow service role to insert user_ranches entries
    - This enables edge functions using service role to properly associate users with ranches
  
  2. Security
    - Policy is restricted to service_role only
    - Regular authenticated users maintain existing restrictions
*/

-- Add policy for service role to insert user_ranches
CREATE POLICY "Service role can insert user_ranches"
  ON user_ranches
  FOR INSERT
  TO service_role
  WITH CHECK (true);
