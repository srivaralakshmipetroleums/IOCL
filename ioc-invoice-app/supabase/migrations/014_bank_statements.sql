-- Migration: bank_statements
-- SBI current-account imports from Docs/BANK STMNTS/Consolidated FY workbooks

CREATE TABLE bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fy_label TEXT NOT NULL,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  account_name TEXT,
  account_number TEXT NOT NULL,
  account_description TEXT,
  branch TEXT,
  ifsc TEXT,
  opening_balance NUMERIC(14,2),
  closing_balance NUMERIC(14,2),
  source_filename TEXT NOT NULL,
  source_sheet TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_number, period_from, period_to)
);

CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES bank_statements(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  txn_date DATE NOT NULL,
  value_date DATE,
  description TEXT NOT NULL,
  reference_no TEXT,
  branch_code TEXT,
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance NUMERIC(14,2),
  category TEXT NOT NULL DEFAULT 'OTHER' CHECK (
    category IN (
      'IOCL_PAYMENT',
      'IOCL_CREDIT',
      'PHONEPE',
      'CARD_SETTLEMENT',
      'CASH_DEPOSIT',
      'UPI_CREDIT',
      'UPI_DEBIT',
      'SALARY',
      'BANK_CHARGE',
      'NACH_ACH',
      'CHEQUE',
      'NEFT',
      'RTGS',
      'IMPS',
      'TRANSFER',
      'INTEREST',
      'OTHER'
    )
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (statement_id, line_number)
);

CREATE INDEX idx_bank_statements_period ON bank_statements (period_from, period_to);
CREATE INDEX idx_bank_statements_account ON bank_statements (account_number);
CREATE INDEX idx_bank_transactions_statement ON bank_transactions (statement_id);
CREATE INDEX idx_bank_transactions_date ON bank_transactions (txn_date);
CREATE INDEX idx_bank_transactions_category ON bank_transactions (category);

CREATE TRIGGER bank_statements_updated_at
  BEFORE UPDATE ON bank_statements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_bank_statements" ON bank_statements FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_bank_statements" ON bank_statements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_bank_statements" ON bank_statements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_bank_statements" ON bank_statements FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_select_bank_transactions" ON bank_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_bank_transactions" ON bank_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_bank_transactions" ON bank_transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_bank_transactions" ON bank_transactions FOR DELETE TO authenticated USING (true);
