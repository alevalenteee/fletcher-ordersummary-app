/*
  # Persist per-order location assignments

  Adds a `locations` JSONB column to `orders` so manual and auto-assigned
  bin picks travel with the order itself instead of living in per-device
  localStorage. Shape mirrors the in-memory map:

    { "<productIndex>": ["AWN-A", "GR2-B", ...], ... }

  Default is an empty object so existing rows behave like "no assignments".
*/

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS locations jsonb NOT NULL DEFAULT '{}'::jsonb;
