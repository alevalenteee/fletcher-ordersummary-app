/*
  # Create destinations table

  1. New Tables
    - `destinations`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null) — delivery site name in UPPERCASE
      - `created_at` (timestamptz)

  2. Security
    - No RLS (matches existing convention: `profiles`, `product_data`, and
      `orders`/`load_sessions` had RLS disabled in later migrations).

  3. Data
    - Seeds the 11 delivery sites that were previously hardcoded in
      `src/components/OrderForm.tsx` and `src/lib/gemini.ts`.
*/

CREATE TABLE IF NOT EXISTS destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

INSERT INTO destinations (name) VALUES
  ('ARNDELL'),
  ('BANYO'),
  ('SALISBURY'),
  ('DERRIMUT'),
  ('MOONAH'),
  ('JANDAKOT'),
  ('GEPPS CROSS'),
  ('BARON'),
  ('SHEPPARTON'),
  ('EE-FIT'),
  ('CANBERRA')
ON CONFLICT (name) DO NOTHING;
