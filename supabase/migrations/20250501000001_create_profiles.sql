/*
  # Create profiles table

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key)
      - `created_at` (timestamp with timezone)
      - `name` (text, not null)
      - `color` (text, stores hex color code)
      - `is_default` (boolean, indicates if this is the default profile)

  2. Changes
    - Add `profile_id` column to `orders` table as a foreign key to `profiles.id`
    - This allows orders to be associated with specific profiles
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6', -- Default color (blue)
  is_default boolean NOT NULL DEFAULT false
);

-- Add profile_id to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS orders_profile_id_idx 
ON orders (profile_id);

-- Create a constraint to ensure only one default profile exists
CREATE OR REPLACE FUNCTION check_default_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new/updated row is being set as default
  IF NEW.is_default THEN
    -- Set all other profiles to non-default
    UPDATE profiles
    SET is_default = false
    WHERE id != NEW.id;
  END IF;
  
  -- If there are no default profiles and this is an update setting is_default to false
  IF NOT NEW.is_default AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE is_default = true AND id != NEW.id
  ) THEN
    -- Force this to be default if it's the only one or no other defaults exist
    NEW.is_default := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single default profile
CREATE TRIGGER ensure_single_default_profile
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION check_default_profile(); 