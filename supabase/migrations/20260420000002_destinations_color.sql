-- Optional colour override for a destination. When NULL, the client falls
-- back to a deterministic hash-of-name colour from the curated palette.
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS color text;
