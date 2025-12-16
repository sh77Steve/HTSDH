/*
  # Create HTSDH Bovine Database Schema

  1. New Tables
    - `ranches`: Ranch information with location and contact details
    - `animals`: Livestock tracking with medical history and photos
    - `user_ranches`: Junction table for user-ranch associations
    - `admins`: System administrators table

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Implement row-level security based on ranch ownership
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ranches table
CREATE TABLE IF NOT EXISTS ranches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  location text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create animals table
CREATE TABLE IF NOT EXISTS animals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ranch_id uuid REFERENCES ranches(id) ON DELETE CASCADE NOT NULL,
  tag_number text NOT NULL,
  name text,
  sex text CHECK (sex IN ('bull', 'cow', 'steer', 'heifer')),
  birth_date date,
  breed text,
  color text,
  mother_tag text,
  father_tag text,
  purchase_date date,
  purchase_price numeric(10, 2),
  current_value numeric(10, 2),
  medical_history jsonb DEFAULT '[]'::jsonb,
  photos jsonb DEFAULT '[]'::jsonb,
  notes text,
  legacy_uid text,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  weight numeric(10, 2),
  status text DEFAULT 'active' CHECK (status IN ('active', 'sold', 'deceased', 'butchered')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ranch_id, tag_number)
);

-- Create user_ranches junction table
CREATE TABLE IF NOT EXISTS user_ranches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ranch_id uuid REFERENCES ranches(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, ranch_id)
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create licenses table
CREATE TABLE IF NOT EXISTS licenses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ranch_id uuid REFERENCES ranches(id) ON DELETE CASCADE UNIQUE NOT NULL,
  license_key text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  max_animals integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ranch_id uuid REFERENCES ranches(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ranches ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ranches ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Ranches policies
CREATE POLICY "Users can view ranches they belong to"
  ON ranches FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their ranches"
  ON ranches FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can create ranches"
  ON ranches FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can delete their ranches"
  ON ranches FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Animals policies
CREATE POLICY "Users can view animals in their ranches"
  ON animals FOR SELECT
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create animals in their ranches"
  ON animals FOR INSERT
  TO authenticated
  WITH CHECK (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update animals in their ranches"
  ON animals FOR UPDATE
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete animals in their ranches"
  ON animals FOR DELETE
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

-- User ranches policies
CREATE POLICY "Users can view their own ranch associations"
  ON user_ranches FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Ranch owners can manage ranch members"
  ON user_ranches FOR ALL
  TO authenticated
  USING (
    ranch_id IN (
      SELECT id FROM ranches WHERE owner_id = auth.uid()
    )
  );

-- Admins policies
CREATE POLICY "Admins can view all admin records"
  ON admins FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT user_id FROM admins)
  );

-- Licenses policies
CREATE POLICY "Users can view licenses for their ranches"
  ON licenses FOR SELECT
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all licenses"
  ON licenses FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admins)
  );

-- Messages policies
CREATE POLICY "Users can view messages for their ranches"
  ON messages FOR SELECT
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages for their ranches"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their ranches"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_animals_ranch_id ON animals(ranch_id);
CREATE INDEX IF NOT EXISTS idx_animals_tag_number ON animals(tag_number);
CREATE INDEX IF NOT EXISTS idx_user_ranches_user_id ON user_ranches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ranches_ranch_id ON user_ranches(ranch_id);
CREATE INDEX IF NOT EXISTS idx_messages_ranch_id ON messages(ranch_id);
CREATE INDEX IF NOT EXISTS idx_licenses_ranch_id ON licenses(ranch_id);