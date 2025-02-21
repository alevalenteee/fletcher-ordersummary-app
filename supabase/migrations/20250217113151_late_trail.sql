/*
  # Add manifest number to orders table

  1. Changes
    - Add `manifest_number` column to `orders` table
    - Column is nullable since not all orders will have a manifest number
    - Add index for faster lookups by manifest number

  2. Notes
    - Existing orders will have NULL manifest_number
    - No data migration needed
*/

-- Add manifest_number column
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS manifest_number text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS orders_manifest_number_idx 
ON orders (manifest_number);