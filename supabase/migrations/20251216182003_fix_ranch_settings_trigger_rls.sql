/*
  # Fix Ranch Settings Trigger RLS Issue

  1. Problem
    - The create_ranch_settings() trigger function was failing because it couldn't INSERT into ranch_settings due to RLS
    - Even though the function is SECURITY DEFINER, it still respects RLS by default
    - The previous migration dropped the INSERT policy on ranch_settings

  2. Solution
    - Configure the trigger function to bypass RLS
    - This is safe because the function only inserts a ranch_settings row for the ranch_id that was just created
    - The function is SECURITY DEFINER and tightly controlled
*/

-- Allow the trigger function to bypass RLS when inserting ranch_settings
ALTER FUNCTION create_ranch_settings() SECURITY DEFINER SET row_security = off;
