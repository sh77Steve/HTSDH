/*
  # Fix Complete Database Schema
  
  This migration corrects the database schema to match the original application requirements.
  
  1. Drop incorrectly structured tables
    - ranches (wrong columns)
    - animals (wrong columns)
    - user_ranches (wrong columns)
    - admins (wrong structure)
    - licenses (wrong structure)
    - messages (not needed)
  
  2. Create correct tables
    - users (public schema)
    - ranches (correct structure with license fields)
    - user_ranches (correct structure with UserRole)
    - ranch_settings
    - animals (correct structure)
    - medical_history
    - animal_photos
    - count_report_snapshots
    - terms_acceptances
    - custom_field_definitions
    - custom_field_values
    - admins (correct structure)
    - license_keys
  
  3. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
*/

-- Drop existing tables with wrong schema
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS licenses CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS user_ranches CASCADE;
DROP TABLE IF EXISTS animals CASCADE;
DROP TABLE IF EXISTS ranches CASCADE;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ranches table with correct structure
CREATE TABLE IF NOT EXISTS ranches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  active_license_key text,
  license_type text CHECK (license_type IN ('full', 'demo')),
  license_expiration timestamptz,
  license_activated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_ranches with correct structure
CREATE TABLE IF NOT EXISTS user_ranches (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ranch_id uuid REFERENCES ranches(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN', 'RANCHHAND', 'VIEWER', 'VET')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, ranch_id)
);

-- Create ranch_settings table
CREATE TABLE IF NOT EXISTS ranch_settings (
  ranch_id uuid PRIMARY KEY REFERENCES ranches(id) ON DELETE CASCADE,
  report_line1 text DEFAULT '',
  report_line2 text DEFAULT '',
  adult_age_years integer DEFAULT 2,
  time_zone text DEFAULT 'America/Los_Angeles',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create animals table with correct structure
CREATE TABLE IF NOT EXISTS animals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ranch_id uuid REFERENCES ranches(id) ON DELETE CASCADE NOT NULL,
  legacy_uid text,
  source text NOT NULL CHECK (source IN ('BORN', 'PURCHASED')),
  status text DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'SOLD', 'BUTCHERED', 'DEAD')),
  tag_number text,
  tag_color text,
  name text,
  sex text NOT NULL CHECK (sex IN ('BULL', 'STEER', 'HEIFER')),
  description text,
  birth_date date,
  weaning_date date,
  exit_date date,
  mother_id uuid REFERENCES animals(id) ON DELETE SET NULL,
  father_id uuid REFERENCES animals(id) ON DELETE SET NULL,
  weight_lbs numeric(10, 2),
  sale_price numeric(10, 2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create medical_history table
CREATE TABLE IF NOT EXISTS medical_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid REFERENCES animals(id) ON DELETE CASCADE NOT NULL,
  ranch_id uuid REFERENCES ranches(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  description text NOT NULL,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create animal_photos table
CREATE TABLE IF NOT EXISTS animal_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid REFERENCES animals(id) ON DELETE CASCADE NOT NULL,
  ranch_id uuid REFERENCES ranches(id) ON DELETE CASCADE NOT NULL,
  storage_url text NOT NULL,
  thumbnail_url text,
  caption text,
  taken_at timestamptz,
  taken_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_primary boolean DEFAULT false,
  is_synced boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create count_report_snapshots table
CREATE TABLE IF NOT EXISTS count_report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ranch_id uuid REFERENCES ranches(id) ON DELETE CASCADE NOT NULL,
  snapshot_date date DEFAULT CURRENT_DATE,
  data jsonb NOT NULL,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create terms_acceptances table
CREATE TABLE IF NOT EXISTS terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  terms_version text NOT NULL,
  accepted_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Create custom_field_definitions table
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ranch_id uuid REFERENCES ranches(id) ON DELETE CASCADE NOT NULL,
  field_name text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'dollar', 'integer', 'decimal')),
  include_in_totals boolean DEFAULT false,
  is_required boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create custom_field_values table
CREATE TABLE IF NOT EXISTS custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid REFERENCES animals(id) ON DELETE CASCADE NOT NULL,
  field_id uuid REFERENCES custom_field_definitions(id) ON DELETE CASCADE NOT NULL,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(animal_id, field_id)
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create license_keys table
CREATE TABLE IF NOT EXISTS license_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  license_type text NOT NULL CHECK (license_type IN ('full', 'demo')),
  expiration_date timestamptz NOT NULL,
  used_by_ranch_id uuid REFERENCES ranches(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ranches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranch_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_keys ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Ranches policies
CREATE POLICY "Users can view ranches they belong to"
  ON ranches FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create ranches"
  ON ranches FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update their ranches"
  ON ranches FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT ranch_id FROM user_ranches 
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    id IN (
      SELECT ranch_id FROM user_ranches 
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can delete their ranches"
  ON ranches FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT ranch_id FROM user_ranches 
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- User ranches policies
CREATE POLICY "Users can view their ranch associations"
  ON user_ranches FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create ranch associations"
  ON user_ranches FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage ranch members"
  ON user_ranches FOR ALL
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches 
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Ranch settings policies
CREATE POLICY "Users can view settings for their ranches"
  ON ranch_settings FOR SELECT
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage ranch settings"
  ON ranch_settings FOR ALL
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches 
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

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

-- Medical history policies
CREATE POLICY "Users can view medical history for animals in their ranches"
  ON medical_history FOR SELECT
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create medical history for animals in their ranches"
  ON medical_history FOR INSERT
  TO authenticated
  WITH CHECK (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update medical history in their ranches"
  ON medical_history FOR UPDATE
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

CREATE POLICY "Users can delete medical history in their ranches"
  ON medical_history FOR DELETE
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

-- Animal photos policies
CREATE POLICY "Users can view photos for animals in their ranches"
  ON animal_photos FOR SELECT
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create photos for animals in their ranches"
  ON animal_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update photos in their ranches"
  ON animal_photos FOR UPDATE
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

CREATE POLICY "Users can delete photos in their ranches"
  ON animal_photos FOR DELETE
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

-- Count report snapshots policies
CREATE POLICY "Users can view snapshots for their ranches"
  ON count_report_snapshots FOR SELECT
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create snapshots for their ranches"
  ON count_report_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

-- Terms acceptances policies
CREATE POLICY "Users can view their own terms acceptances"
  ON terms_acceptances FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own terms acceptances"
  ON terms_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Custom field definitions policies
CREATE POLICY "Users can view custom fields for their ranches"
  ON custom_field_definitions FOR SELECT
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage custom fields for their ranches"
  ON custom_field_definitions FOR ALL
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches 
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Custom field values policies
CREATE POLICY "Users can view custom field values for animals in their ranches"
  ON custom_field_values FOR SELECT
  TO authenticated
  USING (
    animal_id IN (
      SELECT a.id FROM animals a
      WHERE a.ranch_id IN (
        SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage custom field values for animals in their ranches"
  ON custom_field_values FOR ALL
  TO authenticated
  USING (
    animal_id IN (
      SELECT a.id FROM animals a
      WHERE a.ranch_id IN (
        SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
      )
    )
  );

-- Admins policies
CREATE POLICY "Admins can view all admin records"
  ON admins FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admins)
  );

-- License keys policies
CREATE POLICY "Users can view available license keys"
  ON license_keys FOR SELECT
  TO authenticated
  USING (used_by_ranch_id IS NULL OR used_by_ranch_id IN (
    SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all license keys"
  ON license_keys FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admins)
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_ranches_user_id ON user_ranches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ranches_ranch_id ON user_ranches(ranch_id);
CREATE INDEX IF NOT EXISTS idx_animals_ranch_id ON animals(ranch_id);
CREATE INDEX IF NOT EXISTS idx_animals_mother_id ON animals(mother_id);
CREATE INDEX IF NOT EXISTS idx_animals_father_id ON animals(father_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_animal_id ON medical_history(animal_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_ranch_id ON medical_history(ranch_id);
CREATE INDEX IF NOT EXISTS idx_animal_photos_animal_id ON animal_photos(animal_id);
CREATE INDEX IF NOT EXISTS idx_animal_photos_ranch_id ON animal_photos(ranch_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_animal_id ON custom_field_values(animal_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field_id ON custom_field_values(field_id);
CREATE INDEX IF NOT EXISTS idx_terms_acceptances_user_id ON terms_acceptances(user_id);
