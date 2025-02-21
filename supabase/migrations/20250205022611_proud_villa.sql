/*
  # Create orders table

  1. New Tables
    - `orders`
      - `id` (uuid, primary key)
      - `created_at` (timestamp with timezone)
      - `destination` (text)
      - `time` (text)
      - `products` (jsonb array)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on `orders` table
    - Add policies for authenticated users to:
      - Create their own orders
      - Read their own orders
      - Update their own orders
      - Delete their own orders
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  destination text NOT NULL,
  time text NOT NULL,
  products jsonb NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL
);

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders"
  ON orders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);