/*
  # Fix Duplicate Ranch Creation Triggers
  
  1. Problem
    - Two triggers are both trying to insert into user_ranches when a ranch is created
    - `add_creator_to_user_ranches_trigger` adds user as ADMIN
    - `on_ranch_created` adds user as OWNER
    - This causes a primary key violation on (user_id, ranch_id)
    
  2. Solution
    - Drop the older trigger `add_creator_to_user_ranches_trigger`
    - Keep `on_ranch_created` which correctly assigns OWNER role
    - This allows the ranch creation to complete successfully
*/

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS add_creator_to_user_ranches_trigger ON ranches;
DROP FUNCTION IF EXISTS add_creator_to_user_ranches();
