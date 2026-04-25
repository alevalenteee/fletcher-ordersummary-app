/*
  # Add staging locations (AWNSTAGING, FABSTAGING)

  Seeded into `locations` so they appear in the picker and inventory CSV mapping.
*/

INSERT INTO locations (code, "group", sort_order) VALUES
  ('AWNSTAGING', 'AWNING', 3),
  ('FABSTAGING', 'FABRICATION', 17)
ON CONFLICT (code) DO NOTHING;
