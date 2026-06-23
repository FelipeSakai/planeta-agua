ALTER TABLE customers ADD COLUMN is_active boolean NOT NULL DEFAULT true;

CREATE TYPE bottle_type AS ENUM ('NONE', 'COMPLETE', 'EXCHANGE');
ALTER TABLE products ADD COLUMN bottle_type bottle_type NOT NULL DEFAULT 'NONE';

CREATE TABLE customer_bottles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id),
  sale_id uuid REFERENCES sales(id),
  month integer NOT NULL,
  year integer NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX customer_bottles_customer_id_idx ON customer_bottles(customer_id);
CREATE INDEX customer_bottles_is_active_idx ON customer_bottles(is_active);
