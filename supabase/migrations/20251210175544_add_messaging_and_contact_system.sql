/*
  # Add Messaging System and Contact Information
  
  ## Overview
  Adds a comprehensive messaging system between admins and ranch users, plus contact information storage.
  
  ## New Tables
  
  ### `messages`
  - `id` (uuid, primary key) - Unique message identifier
  - `ranch_id` (uuid, foreign key) - Links to ranches table
  - `from_admin` (boolean) - True if message is from admin, false if from ranch user
  - `content` (text) - Message body
  - `read` (boolean) - Read/unread status, defaults to false
  - `created_at` (timestamptz) - When message was sent
  
  ## Modified Tables
  
  ### `ranches`
  - Added `contact_name` (text) - Contact person's name
  - Added `contact_email` (text) - Contact email address
  - Added `contact_phone` (text) - Contact phone number
  - Added `terms_accepted_at` (timestamptz) - When user accepted terms
  - Added `last_terms_version` (text) - Version of terms accepted
  
  ## Security
  - Enable RLS on messages table
  - Admins can read all messages
  - Ranch users can only read messages for their own ranches
  - Both admins and ranch users can insert messages
  - Messages can be updated (for read status) by appropriate users
  
  ## Notes
  - Messages older than the last 3 per ranch can be queried but UI will only show last 3 for users
  - Broadcast messages are stored as individual messages to each ranch
  - Contact info helps admins reach ranch users outside the app if needed
*/

-- Add contact and terms fields to ranches table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ranches' AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE ranches ADD COLUMN contact_name text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ranches' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE ranches ADD COLUMN contact_email text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ranches' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE ranches ADD COLUMN contact_phone text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ranches' AND column_name = 'terms_accepted_at'
  ) THEN
    ALTER TABLE ranches ADD COLUMN terms_accepted_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ranches' AND column_name = 'last_terms_version'
  ) THEN
    ALTER TABLE ranches ADD COLUMN last_terms_version text;
  END IF;
END $$;

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ranch_id uuid NOT NULL REFERENCES ranches(id) ON DELETE CASCADE,
  from_admin boolean NOT NULL DEFAULT false,
  content text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS messages_ranch_id_created_at_idx ON messages(ranch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_read_idx ON messages(read) WHERE read = false;

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Admins can read all messages
CREATE POLICY "Admins can read all messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- Ranch users can read messages for their ranches
CREATE POLICY "Users can read messages for their ranches"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches 
      WHERE user_id = auth.uid()
    )
  );

-- Admins can send messages (insert)
CREATE POLICY "Admins can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- Ranch users can send messages for their ranches
CREATE POLICY "Users can send messages for their ranches"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches 
      WHERE user_id = auth.uid()
    )
  );

-- Admins can update all messages (mark as read)
CREATE POLICY "Admins can update all messages"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins 
      WHERE admins.user_id = auth.uid()
    )
  );

-- Ranch users can update messages for their ranches (mark as read)
CREATE POLICY "Users can update messages for their ranches"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches 
      WHERE user_id = auth.uid()
    )
  );