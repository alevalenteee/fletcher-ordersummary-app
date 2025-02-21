/*
  # Remove authentication requirements

  1. Changes
    - Drop existing RLS policies
    - Disable RLS
    - Make user_id column nullable and remove foreign key constraint
    - Make table publicly accessible

  2. Security Note
    - This migration removes authentication requirements as requested
    - The table will be publicly accessible for all operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON orders;

-- Disable RLS
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Make user_id nullable and remove foreign key constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;