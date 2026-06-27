/*
  # Persist split-load metadata on orders

  Adds a `split_load` JSONB column for manifests with multiple delivery
  address blocks. Shape mirrors the in-memory SplitLoad type:

    {
      "stops": [
        {
          "deliveryAddress": "FI - Shepparton, 62 Florence Street ...",
          "destination": "SHEPPARTON",
          "trailer": "A" | "B" | null,
          "productIndexes": [0, 1, 2]
        }
      ]
    }

  Default is null so standard single-destination orders are unchanged.
*/

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS split_load jsonb DEFAULT NULL;
