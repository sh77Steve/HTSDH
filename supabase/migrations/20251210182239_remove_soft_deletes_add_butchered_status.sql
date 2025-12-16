/*
  # Remove Soft Deletes and Add Butchered Status

  ## Overview
  This migration removes the soft delete mechanism (is_active flag) and enhances 
  the animal status tracking system to better reflect the ranch operations reality.

  ## Changes Made
  
  1. **Enhanced Status Tracking**
     - Add 'BUTCHERED' to animal_status enum
     - Existing statuses: PRESENT, SOLD, DEAD, BUTCHERED
  
  2. **Remove Soft Deletes**
     - Remove the `is_active` column from animals table
     - All animals in the database are "real" animals that count toward license limits
     - Deletes will be hard deletes with confirmation dialogs
  
  3. **License Enforcement**
     - License limits count ALL animals in database regardless of status
     - No loopholes to bypass license limits by changing animal status or soft-deleting
     - Users pay for all animals stored in the database
  
  ## Migration Strategy
  - Migrate is_active=false animals to status='DEAD' (since they were soft-deleted)
  - Remove is_active column after data migration
  
  ## Important Notes
  - Hard deletes with confirmation replace soft deletes
  - Butchered animals are tracked with status but still count toward license
  - To free up license space, users must hard delete animals from database
*/

-- Add BUTCHERED to the animal_status enum
ALTER TYPE animal_status ADD VALUE IF NOT EXISTS 'BUTCHERED';

-- Migrate animals that were soft-deleted (is_active=false) to DEAD status
-- Only update if they aren't already marked as SOLD or DEAD
UPDATE animals
SET status = 'DEAD'
WHERE is_active = false 
  AND status = 'PRESENT';

-- Drop the is_active column
ALTER TABLE animals DROP COLUMN IF EXISTS is_active;