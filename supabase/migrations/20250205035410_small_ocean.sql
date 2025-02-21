/*
  # Add product data table

  1. New Tables
    - `product_data`
      - `id` (uuid, primary key)
      - `data` (jsonb, stores product data array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Add trigger to automatically update updated_at timestamp
*/

CREATE TABLE IF NOT EXISTS product_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update timestamp
CREATE TRIGGER update_product_data_updated_at
  BEFORE UPDATE ON product_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();