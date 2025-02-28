/*
  # Add updated_at to orders table

  1. Changes
    - Add `updated_at` column to `orders` table
    - Column is automatically set to current time on creation
    - Column is automatically updated when the record is modified
*/

-- Add updated_at column with default to current timestamp
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create or replace trigger function to update the timestamp
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop the trigger if it exists then create it again
DROP TRIGGER IF EXISTS update_orders_timestamp ON orders;

-- Create the trigger on orders table
CREATE TRIGGER update_orders_timestamp
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column(); 