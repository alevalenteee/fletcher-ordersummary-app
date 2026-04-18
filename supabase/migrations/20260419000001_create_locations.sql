/*
  # Create locations table

  1. New Tables
    - `locations`
      - `id` (uuid, primary key)
      - `code` (text, unique, not null) — location code (e.g. AWN-A, GR2-C, FAB-O, XDOCK)
      - `group` (text, not null) — one of AWNING, GR2, FABRICATION
      - `sort_order` (integer, not null) — order within group
      - `created_at` (timestamptz)

  2. Security
    - No RLS (matches existing convention: `profiles`, `product_data`,
      `orders`/`load_sessions`, and `destinations` all have RLS disabled).

  3. Data
    - Seeds the hardcoded catalogue:
      - AWNING: AWN-A..AWN-F plus XDOCK
      - GR2:    GR2-A..GR2-U
      - FABRICATION: FAB-A..FAB-O
*/

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  "group" text NOT NULL CHECK ("group" IN ('AWNING','GR2','FABRICATION')),
  sort_order integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

INSERT INTO locations (code, "group", sort_order) VALUES
  ('AWN-A','AWNING',1),
  ('AWN-B','AWNING',2),
  ('AWN-C','AWNING',3),
  ('AWN-D','AWNING',4),
  ('AWN-E','AWNING',5),
  ('AWN-F','AWNING',6),
  ('XDOCK','AWNING',7),
  ('GR2-A','GR2',1),
  ('GR2-B','GR2',2),
  ('GR2-C','GR2',3),
  ('GR2-D','GR2',4),
  ('GR2-E','GR2',5),
  ('GR2-F','GR2',6),
  ('GR2-G','GR2',7),
  ('GR2-H','GR2',8),
  ('GR2-I','GR2',9),
  ('GR2-J','GR2',10),
  ('GR2-K','GR2',11),
  ('GR2-L','GR2',12),
  ('GR2-M','GR2',13),
  ('GR2-N','GR2',14),
  ('GR2-O','GR2',15),
  ('GR2-P','GR2',16),
  ('GR2-Q','GR2',17),
  ('GR2-R','GR2',18),
  ('GR2-S','GR2',19),
  ('GR2-T','GR2',20),
  ('GR2-U','GR2',21),
  ('FAB-A','FABRICATION',1),
  ('FAB-B','FABRICATION',2),
  ('FAB-C','FABRICATION',3),
  ('FAB-D','FABRICATION',4),
  ('FAB-E','FABRICATION',5),
  ('FAB-F','FABRICATION',6),
  ('FAB-G','FABRICATION',7),
  ('FAB-H','FABRICATION',8),
  ('FAB-I','FABRICATION',9),
  ('FAB-J','FABRICATION',10),
  ('FAB-K','FABRICATION',11),
  ('FAB-L','FABRICATION',12),
  ('FAB-M','FABRICATION',13),
  ('FAB-N','FABRICATION',14),
  ('FAB-O','FABRICATION',15),
  ('FABFOIL','FABRICATION',16)
ON CONFLICT (code) DO NOTHING;
