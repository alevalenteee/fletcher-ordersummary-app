/*
  # Simplify AWNING locations

  Replaces AWN-A..AWN-F with a single catch-all `AWNING` entry. Keeps
  `XDOCK` because it's still used on the floor.

  Post-migration the AWNING group contains exactly two codes:
    - AWNING (sort_order 1)
    - XDOCK  (sort_order 2)
*/

DELETE FROM locations WHERE code LIKE 'AWN-%';

INSERT INTO locations (code, "group", sort_order) VALUES
  ('AWNING','AWNING',1)
ON CONFLICT (code) DO NOTHING;

UPDATE locations SET sort_order = 2 WHERE code = 'XDOCK';
