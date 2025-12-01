/*
  # HTSDH Bovine Database V2 - Complete Schema

  ## Overview
  This migration creates the complete database schema for the HTSDH Bovine Database V2,
  a cloud-based cattle management system with multi-ranch support, medical history tracking,
  photo management, and comprehensive reporting capabilities.

  ## New Tables Created

  ### 1. ranches
  Represents individual ranch operations. The system is multi-tenant, with all data scoped to ranches.
  - `id` (uuid, primary key) - Unique ranch identifier
  - `name` (text) - Ranch name
  - `location` (text, nullable) - Ranch location/address
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. users
  Extends Supabase auth.users with application-specific profile information.
  - `id` (uuid, primary key) - References auth.users(id)
  - `email` (text) - User email address
  - `name` (text) - User display name
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. user_ranches
  Join table managing user-ranch relationships and role assignments.
  - `user_id` (uuid) - References users(id)
  - `ranch_id` (uuid) - References ranches(id)
  - `role` (enum) - User role: ADMIN, RANCHHAND, VIEWER, VET
  - `created_at` (timestamptz) - Record creation timestamp

  ### 4. ranch_settings
  Per-ranch configuration for reports and business rules.
  - `ranch_id` (uuid, primary key) - References ranches(id)
  - `report_line1` (text) - First line printed on reports
  - `report_line2` (text) - Second line printed on reports
  - `adult_age_years` (decimal) - Age threshold for adult vs young classification
  - `time_zone` (text) - Ranch time zone for date display
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 5. animals
  Core table representing individual bovine animals.
  - `id` (uuid, primary key) - Unique animal identifier
  - `ranch_id` (uuid) - References ranches(id)
  - `legacy_uid` (varchar(6), nullable) - Optional 6-digit UID from V1 system
  - `source` (enum) - BORN or PURCHASED
  - `status` (enum) - PRESENT, SOLD, or DEAD
  - `tag_number` (text, nullable) - Ear tag number
  - `tag_color` (text, nullable) - Ear tag color
  - `name` (text, nullable) - Animal name
  - `sex` (enum) - BULL, STEER, or HEIFER
  - `description` (text, nullable) - Physical description, breed, notes
  - `birth_date` (date, nullable) - Date of birth
  - `weaning_date` (date, nullable) - Date weaned
  - `exit_date` (date, nullable) - Date sold or died
  - `mother_id` (uuid, nullable) - References animals(id) for dam
  - `notes` (text, nullable) - Freeform notes
  - `is_active` (boolean) - Soft delete flag
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 6. medical_history
  Medical procedures, vaccinations, and diagnoses for animals.
  - `id` (uuid, primary key) - Unique record identifier
  - `animal_id` (uuid) - References animals(id)
  - `ranch_id` (uuid) - References ranches(id) for scoping
  - `date` (date) - Date of procedure/diagnosis
  - `description` (text) - Procedure description
  - `created_by_user_id` (uuid, nullable) - References users(id)
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 7. animal_photos
  Photos associated with animals, supporting offline capture and sync.
  - `id` (uuid, primary key) - Unique photo identifier
  - `animal_id` (uuid) - References animals(id)
  - `ranch_id` (uuid) - References ranches(id)
  - `storage_url` (text) - Cloud storage URL for full-size image
  - `thumbnail_url` (text, nullable) - Cloud storage URL for thumbnail
  - `caption` (text, nullable) - Optional photo description
  - `taken_at` (timestamptz, nullable) - When photo was taken
  - `taken_by_user_id` (uuid, nullable) - References users(id)
  - `is_primary` (boolean) - Whether this is the hero image
  - `is_synced` (boolean) - Whether photo has been uploaded to cloud
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 8. count_report_snapshots
  Historical snapshots of count reports for trend analysis.
  - `id` (uuid, primary key) - Unique snapshot identifier
  - `ranch_id` (uuid) - References ranches(id)
  - `snapshot_date` (timestamptz) - When snapshot was taken
  - `data` (jsonb) - Complete count report data
  - `created_by_user_id` (uuid, nullable) - References users(id)
  - `created_at` (timestamptz) - Record creation timestamp

  ### 9. terms_acceptances
  Tracks user acceptance of terms and liability agreements.
  - `id` (uuid, primary key) - Unique acceptance identifier
  - `user_id` (uuid) - References users(id)
  - `terms_version` (text) - Version identifier of terms accepted
  - `accepted_at` (timestamptz) - When terms were accepted
  - `ip_address` (text, nullable) - User IP at time of acceptance
  - `user_agent` (text, nullable) - User agent at time of acceptance

  ## Security Configuration

  All tables have Row Level Security (RLS) enabled with restrictive policies:
  - Users can only access data for ranches they belong to
  - Role-based permissions enforced (ADMIN, RANCHHAND, VIEWER, VET)
  - Authentication required for all data access
  - No public access to any tables

  ## Indexes Created

  Performance indexes on frequently queried columns:
  - Animals: ranch_id, status, tag_number, name, mother_id
  - Medical History: animal_id, ranch_id, date
  - Photos: animal_id, ranch_id
  - User Ranches: user_id, ranch_id

  ## Important Notes

  1. **Data Safety**: No destructive operations; all constraints use IF NOT EXISTS
  2. **Multi-Tenancy**: All data strictly scoped by ranch_id
  3. **Soft Deletes**: Animals use is_active flag rather than hard deletes
  4. **V1 Compatibility**: legacy_uid field supports migration from V1 CSV format
  5. **Offline Support**: animal_photos includes is_synced flag for PWA functionality
  6. **Audit Trail**: created_by_user_id fields enable change tracking
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'RANCHHAND', 'VIEWER', 'VET');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE animal_source AS ENUM ('BORN', 'PURCHASED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE animal_status AS ENUM ('PRESENT', 'SOLD', 'DEAD');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE animal_sex AS ENUM ('BULL', 'STEER', 'HEIFER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Table: ranches
CREATE TABLE IF NOT EXISTS ranches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  location text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: users (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: user_ranches (join table with roles)
CREATE TABLE IF NOT EXISTS user_ranches (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ranch_id uuid NOT NULL REFERENCES ranches(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'VIEWER',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, ranch_id)
);

-- Table: ranch_settings
CREATE TABLE IF NOT EXISTS ranch_settings (
  ranch_id uuid PRIMARY KEY REFERENCES ranches(id) ON DELETE CASCADE,
  report_line1 text DEFAULT '',
  report_line2 text DEFAULT '',
  adult_age_years decimal DEFAULT 1.1,
  time_zone text DEFAULT 'America/Denver',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: animals
CREATE TABLE IF NOT EXISTS animals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ranch_id uuid NOT NULL REFERENCES ranches(id) ON DELETE CASCADE,
  legacy_uid varchar(6),
  source animal_source NOT NULL,
  status animal_status NOT NULL DEFAULT 'PRESENT',
  tag_number text,
  tag_color text,
  name text,
  sex animal_sex NOT NULL,
  description text,
  birth_date date,
  weaning_date date,
  exit_date date,
  mother_id uuid REFERENCES animals(id) ON DELETE SET NULL,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: medical_history
CREATE TABLE IF NOT EXISTS medical_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  ranch_id uuid NOT NULL REFERENCES ranches(id) ON DELETE CASCADE,
  date date NOT NULL,
  description text NOT NULL,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: animal_photos
CREATE TABLE IF NOT EXISTS animal_photos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  ranch_id uuid NOT NULL REFERENCES ranches(id) ON DELETE CASCADE,
  storage_url text NOT NULL,
  thumbnail_url text,
  caption text,
  taken_at timestamptz DEFAULT now(),
  taken_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  is_primary boolean DEFAULT false,
  is_synced boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: count_report_snapshots
CREATE TABLE IF NOT EXISTS count_report_snapshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ranch_id uuid NOT NULL REFERENCES ranches(id) ON DELETE CASCADE,
  snapshot_date timestamptz DEFAULT now(),
  data jsonb NOT NULL,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Table: terms_acceptances
CREATE TABLE IF NOT EXISTS terms_acceptances (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  terms_version text NOT NULL,
  accepted_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_animals_ranch_id ON animals(ranch_id);
CREATE INDEX IF NOT EXISTS idx_animals_status ON animals(status);
CREATE INDEX IF NOT EXISTS idx_animals_tag_number ON animals(tag_number);
CREATE INDEX IF NOT EXISTS idx_animals_name ON animals(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_animals_mother_id ON animals(mother_id);
CREATE INDEX IF NOT EXISTS idx_animals_legacy_uid ON animals(legacy_uid);

CREATE INDEX IF NOT EXISTS idx_medical_history_animal_id ON medical_history(animal_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_ranch_id ON medical_history(ranch_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_date ON medical_history(date DESC);

CREATE INDEX IF NOT EXISTS idx_animal_photos_animal_id ON animal_photos(animal_id);
CREATE INDEX IF NOT EXISTS idx_animal_photos_ranch_id ON animal_photos(ranch_id);
CREATE INDEX IF NOT EXISTS idx_animal_photos_is_primary ON animal_photos(is_primary) WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_user_ranches_user_id ON user_ranches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ranches_ranch_id ON user_ranches(ranch_id);

CREATE INDEX IF NOT EXISTS idx_count_snapshots_ranch_id ON count_report_snapshots(ranch_id);
CREATE INDEX IF NOT EXISTS idx_count_snapshots_date ON count_report_snapshots(snapshot_date DESC);

-- Enable Row Level Security on all tables
ALTER TABLE ranches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ranches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranch_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_acceptances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ranches
CREATE POLICY "Users can view ranches they belong to"
  ON ranches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranches.id
      AND user_ranches.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their ranches"
  ON ranches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranches.id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranches.id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'ADMIN'
    )
  );

CREATE POLICY "Authenticated users can create ranches"
  ON ranches FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for users
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_ranches
CREATE POLICY "Users can view their ranch memberships"
  ON user_ranches FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage ranch users"
  ON user_ranches FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches ur
      WHERE ur.ranch_id = user_ranches.ranch_id
      AND ur.user_id = auth.uid()
      AND ur.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches ur
      WHERE ur.ranch_id = user_ranches.ranch_id
      AND ur.user_id = auth.uid()
      AND ur.role = 'ADMIN'
    )
  );

-- RLS Policies for ranch_settings
CREATE POLICY "Users can view settings for their ranches"
  ON ranch_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranch_settings.ranch_id
      AND user_ranches.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage ranch settings"
  ON ranch_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranch_settings.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = ranch_settings.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'ADMIN'
    )
  );

-- RLS Policies for animals
CREATE POLICY "Users can view animals in their ranches"
  ON animals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = animals.ranch_id
      AND user_ranches.user_id = auth.uid()
    )
  );

CREATE POLICY "Ranch hands and admins can insert animals"
  ON animals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = animals.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND')
    )
  );

CREATE POLICY "Ranch hands and admins can update animals"
  ON animals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = animals.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = animals.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND')
    )
  );

CREATE POLICY "Only admins can delete animals"
  ON animals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = animals.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role = 'ADMIN'
    )
  );

-- RLS Policies for medical_history
CREATE POLICY "Users can view medical history in their ranches"
  ON medical_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = medical_history.ranch_id
      AND user_ranches.user_id = auth.uid()
    )
  );

CREATE POLICY "Ranch hands, vets, and admins can insert medical history"
  ON medical_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = medical_history.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND', 'VET')
    )
  );

CREATE POLICY "Ranch hands, vets, and admins can update medical history"
  ON medical_history FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = medical_history.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND', 'VET')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = medical_history.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND', 'VET')
    )
  );

CREATE POLICY "Ranch hands, vets, and admins can delete medical history"
  ON medical_history FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = medical_history.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND', 'VET')
    )
  );

-- RLS Policies for animal_photos
CREATE POLICY "Users can view photos in their ranches"
  ON animal_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = animal_photos.ranch_id
      AND user_ranches.user_id = auth.uid()
    )
  );

CREATE POLICY "Ranch hands and admins can insert photos"
  ON animal_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = animal_photos.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND')
    )
  );

CREATE POLICY "Ranch hands and admins can update photos"
  ON animal_photos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = animal_photos.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = animal_photos.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND')
    )
  );

CREATE POLICY "Ranch hands and admins can delete photos"
  ON animal_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = animal_photos.ranch_id
      AND user_ranches.user_id = auth.uid()
      AND user_ranches.role IN ('ADMIN', 'RANCHHAND')
    )
  );

-- RLS Policies for count_report_snapshots
CREATE POLICY "Users can view snapshots in their ranches"
  ON count_report_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = count_report_snapshots.ranch_id
      AND user_ranches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create snapshots for their ranches"
  ON count_report_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_ranches
      WHERE user_ranches.ranch_id = count_report_snapshots.ranch_id
      AND user_ranches.user_id = auth.uid()
    )
  );

-- RLS Policies for terms_acceptances
CREATE POLICY "Users can view their own terms acceptances"
  ON terms_acceptances FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own terms acceptances"
  ON terms_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_ranches_updated_at BEFORE UPDATE ON ranches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ranch_settings_updated_at BEFORE UPDATE ON ranch_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_animals_updated_at BEFORE UPDATE ON animals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_history_updated_at BEFORE UPDATE ON medical_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_animal_photos_updated_at BEFORE UPDATE ON animal_photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();