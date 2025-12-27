/*
  # Add last backup date tracking to ranches

  1. Changes
    - Add `last_backup_date` column to `ranches` table
    - This tracks when the "Export Complete Backup" feature was last used
    - Used to encourage regular backups and display warnings
    
  2. Notes
    - NULL value indicates no backup has been performed yet
    - Application will update this timestamp when users export complete backups
    - Warning will be shown if last backup is older than 7 days
*/

-- Add last backup date tracking column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ranches' AND column_name = 'last_backup_date'
  ) THEN
    ALTER TABLE ranches ADD COLUMN last_backup_date timestamptz DEFAULT NULL;
  END IF;
END $$;