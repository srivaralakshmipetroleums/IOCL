-- Daily totalizer / day-close account (MS & HSD nozzles, lubes, collections)

CREATE TABLE day_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_date DATE NOT NULL UNIQUE,
  ms_n1_start NUMERIC(14, 3) NOT NULL DEFAULT 0,
  ms_n1_close NUMERIC(14, 3) NOT NULL DEFAULT 0,
  ms_n2_start NUMERIC(14, 3) NOT NULL DEFAULT 0,
  ms_n2_close NUMERIC(14, 3) NOT NULL DEFAULT 0,
  ms_rsp NUMERIC(10, 4),
  hsd_n1_start NUMERIC(14, 3) NOT NULL DEFAULT 0,
  hsd_n1_close NUMERIC(14, 3) NOT NULL DEFAULT 0,
  hsd_n2_start NUMERIC(14, 3) NOT NULL DEFAULT 0,
  hsd_n2_close NUMERIC(14, 3) NOT NULL DEFAULT 0,
  hsd_rsp NUMERIC(10, 4),
  oil_2t_packets INTEGER NOT NULL DEFAULT 0 CHECK (oil_2t_packets >= 0),
  other_lubes NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (other_lubes >= 0),
  cash_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  phonepe_paytm NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (phonepe_paytm >= 0),
  pos_cards NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (pos_cards >= 0),
  credits NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (credits >= 0),
  cash_expenses NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cash_expenses >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_day_closings_business_date
  ON day_closings (business_date DESC);

CREATE TRIGGER day_closings_updated_at
  BEFORE UPDATE ON day_closings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE day_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_day_closings"
  ON day_closings FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_day_closings"
  ON day_closings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_day_closings"
  ON day_closings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_day_closings"
  ON day_closings FOR DELETE TO authenticated USING (true);
