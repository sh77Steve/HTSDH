/*
  # Add Custom Fields Feature

  1. New Tables
    - `custom_field_definitions`
      - `id` (uuid, primary key)
      - `ranch_id` (uuid, foreign key to ranches)
      - `field_name` (text) - Display name of the custom field
      - `field_type` (text) - Type: 'text', 'dollar', 'integer', 'decimal'
      - `include_in_totals` (boolean) - Whether to sum this field in reports
      - `is_required` (boolean) - Whether the field is required for new animals
      - `display_order` (integer) - Order to display fields
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `custom_field_values`
      - `id` (uuid, primary key)
      - `animal_id` (uuid, foreign key to animals)
      - `field_id` (uuid, foreign key to custom_field_definitions)
      - `value` (text) - Stored as text, converted based on field_type
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Users can only manage custom fields for ranches they have access to
    - Users can only manage field values for animals in their ranches
*/

CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ranch_id uuid NOT NULL REFERENCES ranches(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'dollar', 'integer', 'decimal')),
  include_in_totals boolean NOT NULL DEFAULT false,
  is_required boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ranch_id, field_name)
);

CREATE TABLE IF NOT EXISTS custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(animal_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_ranch_id ON custom_field_definitions(ranch_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_display_order ON custom_field_definitions(ranch_id, display_order);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_animal_id ON custom_field_values(animal_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field_id ON custom_field_values(field_id);

ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view custom field definitions for their ranches"
  ON custom_field_definitions FOR SELECT
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert custom field definitions for their ranches"
  ON custom_field_definitions FOR INSERT
  TO authenticated
  WITH CHECK (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update custom field definitions for their ranches"
  ON custom_field_definitions FOR UPDATE
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

CREATE POLICY "Users can delete custom field definitions for their ranches"
  ON custom_field_definitions FOR DELETE
  TO authenticated
  USING (
    ranch_id IN (
      SELECT ranch_id FROM user_ranches WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view custom field values for their animals"
  ON custom_field_values FOR SELECT
  TO authenticated
  USING (
    animal_id IN (
      SELECT a.id FROM animals a
      JOIN user_ranches ur ON ur.ranch_id = a.ranch_id
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert custom field values for their animals"
  ON custom_field_values FOR INSERT
  TO authenticated
  WITH CHECK (
    animal_id IN (
      SELECT a.id FROM animals a
      JOIN user_ranches ur ON ur.ranch_id = a.ranch_id
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update custom field values for their animals"
  ON custom_field_values FOR UPDATE
  TO authenticated
  USING (
    animal_id IN (
      SELECT a.id FROM animals a
      JOIN user_ranches ur ON ur.ranch_id = a.ranch_id
      WHERE ur.user_id = auth.uid()
    )
  )
  WITH CHECK (
    animal_id IN (
      SELECT a.id FROM animals a
      JOIN user_ranches ur ON ur.ranch_id = a.ranch_id
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete custom field values for their animals"
  ON custom_field_values FOR DELETE
  TO authenticated
  USING (
    animal_id IN (
      SELECT a.id FROM animals a
      JOIN user_ranches ur ON ur.ranch_id = a.ranch_id
      WHERE ur.user_id = auth.uid()
    )
  );
