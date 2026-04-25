/*
  # Inventory table (CSV snapshot, single logical batch per upload)

  Rows are replaced on each upload. Client purges when batch is older than 12h.
*/

CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_code text NOT NULL,
  product_code text NOT NULL,
  quantity integer NOT NULL CHECK (quantity >= 0),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_product_code_idx ON inventory (product_code);
CREATE INDEX IF NOT EXISTS inventory_uploaded_at_idx ON inventory (uploaded_at);
