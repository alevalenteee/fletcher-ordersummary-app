/*
  # Add transport company to orders table

  1. Changes
    - Add `transport_company` column to `orders` table
    - Column is nullable since not all orders will have a transport company
    - Add index for faster lookups by transport company

  2. Notes
    - Existing orders will have NULL transport_company
    - No data migration needed
*/

-- Add transport_company column
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS transport_company text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS orders_transport_company_idx 
ON orders (transport_company); 