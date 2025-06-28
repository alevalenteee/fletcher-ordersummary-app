/*
  # Add trailer information to orders table

  1. Changes
    - Add `trailer_type` column to `orders` table
    - Add `trailer_size` column to `orders` table
    - Both columns are nullable since not all orders will have trailer information
    - Add indexes for faster lookups

  2. Notes
    - Existing orders will have NULL trailer values
    - No data migration needed
*/

-- Add trailer_type column
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS trailer_type text;

-- Add trailer_size column
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS trailer_size text;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS orders_trailer_type_idx 
ON orders (trailer_type);

CREATE INDEX IF NOT EXISTS orders_trailer_size_idx 
ON orders (trailer_size); 