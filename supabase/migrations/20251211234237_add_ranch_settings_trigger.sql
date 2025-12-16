/*
  # Add Automatic Ranch Settings Creation

  1. Changes
    - Create a trigger function that automatically creates ranch_settings when a ranch is created
    - Add trigger to ranches table
    - Drop the INSERT policy on ranch_settings (no longer needed for initial creation)
    
  2. Security
    - Ranch settings are automatically created server-side
    - No need for application to insert ranch_settings
*/

-- Create function to automatically create ranch settings
CREATE OR REPLACE FUNCTION create_ranch_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ranch_settings (ranch_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS create_ranch_settings_trigger ON ranches;
CREATE TRIGGER create_ranch_settings_trigger
  AFTER INSERT ON ranches
  FOR EACH ROW
  EXECUTE FUNCTION create_ranch_settings();

-- Drop the INSERT policy since settings are created automatically
DROP POLICY IF EXISTS "Admins can insert ranch settings" ON ranch_settings;
