-- Migration: pad_statements
-- IOCL PAD (Price Advance Deposit) ledger imports from Spandan HTML exports

CREATE TABLE pad_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fy_label TEXT NOT NULL,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  customer_name TEXT,
  customer_code TEXT,
  controlling_office TEXT,
  report_generated_at TIMESTAMPTZ,
  opening_balance NUMERIC(14,2),
  closing_balance NUMERIC(14,2),
  open_delivery_value NUMERIC(14,2),
  source_filename TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period_from, period_to, customer_code)
);

CREATE TABLE pad_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES pad_statements(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  plant TEXT,
  item_text TEXT NOT NULL,
  document_type TEXT,
  document_number TEXT,
  transaction_date DATE,
  material_group TEXT,
  quantity NUMERIC(14,3),
  unit TEXT,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance NUMERIC(14,2),
  category TEXT NOT NULL DEFAULT 'OTHER' CHECK (
    category IN (
      'FUEL_MS',
      'FUEL_HSD',
      'PAYMENT',
      'MARGIN',
      'DISCOUNT',
      'FEE',
      'INTEREST',
      'CREDIT_MEMO',
      'SUMMARY',
      'OTHER'
    )
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (statement_id, line_number)
);

CREATE INDEX idx_pad_statements_period ON pad_statements (period_from, period_to);
CREATE INDEX idx_pad_transactions_statement ON pad_transactions (statement_id);
CREATE INDEX idx_pad_transactions_date ON pad_transactions (transaction_date);
CREATE INDEX idx_pad_transactions_category ON pad_transactions (category);
CREATE INDEX idx_pad_transactions_document_number ON pad_transactions (document_number);

CREATE TRIGGER pad_statements_updated_at
  BEFORE UPDATE ON pad_statements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE pad_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pad_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_pad_statements" ON pad_statements FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_pad_statements" ON pad_statements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_pad_statements" ON pad_statements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_pad_statements" ON pad_statements FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_select_pad_transactions" ON pad_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_pad_transactions" ON pad_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_pad_transactions" ON pad_transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_pad_transactions" ON pad_transactions FOR DELETE TO authenticated USING (true);
