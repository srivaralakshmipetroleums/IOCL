-- Migration: retail_selling_prices
-- Historical MS/HSD retail selling prices for PAD profit calculations

CREATE TABLE retail_selling_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product TEXT NOT NULL CHECK (product IN ('MS', 'HSD')),
  effective_from DATE NOT NULL,
  price_per_litre NUMERIC(10,4) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product, effective_from)
);

CREATE INDEX idx_retail_selling_prices_product_date
  ON retail_selling_prices (product, effective_from DESC);

CREATE TRIGGER retail_selling_prices_updated_at
  BEFORE UPDATE ON retail_selling_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE retail_selling_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_retail_selling_prices"
  ON retail_selling_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_retail_selling_prices"
  ON retail_selling_prices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_retail_selling_prices"
  ON retail_selling_prices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_retail_selling_prices"
  ON retail_selling_prices FOR DELETE TO authenticated USING (true);
