-- Migration: stock_snapshots
-- Tank stock (litres) at period boundaries for unified business dashboard

CREATE TABLE stock_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('month', 'financial_year')),
  period_key TEXT NOT NULL,
  product TEXT NOT NULL CHECK (product IN ('MS', 'HSD')),
  snapshot_kind TEXT NOT NULL CHECK (snapshot_kind IN ('opening', 'closing')),
  quantity_litres NUMERIC(12, 3) NOT NULL CHECK (quantity_litres >= 0),
  effective_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (scope, period_key, product, snapshot_kind)
);

CREATE INDEX idx_stock_snapshots_scope_period
  ON stock_snapshots (scope, period_key, product);

CREATE TRIGGER stock_snapshots_updated_at
  BEFORE UPDATE ON stock_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE stock_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_stock_snapshots"
  ON stock_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_stock_snapshots"
  ON stock_snapshots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_stock_snapshots"
  ON stock_snapshots FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_stock_snapshots"
  ON stock_snapshots FOR DELETE TO authenticated USING (true);

-- FY 2025-26 boundary stock (user-provided)
INSERT INTO stock_snapshots (scope, period_key, product, snapshot_kind, quantity_litres, effective_date, notes)
VALUES
  ('financial_year', '2025', 'MS', 'opening', 13264, '2025-04-01', 'Apr 2025 opening — Petrol'),
  ('financial_year', '2025', 'HSD', 'opening', 15231, '2025-04-01', 'Apr 2025 opening — Diesel'),
  ('financial_year', '2025', 'MS', 'closing', 10241, '2026-03-31', 'Mar 2026 closing — Petrol'),
  ('financial_year', '2025', 'HSD', 'closing', 12510, '2026-03-31', 'Mar 2026 closing — Diesel')
ON CONFLICT (scope, period_key, product, snapshot_kind) DO NOTHING;
