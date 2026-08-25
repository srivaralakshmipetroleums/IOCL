-- Split lubes/receipts by MS and HSD; testing litres; described credit/expense rows; pump boy

ALTER TABLE day_closings
  ADD COLUMN IF NOT EXISTS ms_n1_testing NUMERIC(14, 3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ms_n2_testing NUMERIC(14, 3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hsd_n1_testing NUMERIC(14, 3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hsd_n2_testing NUMERIC(14, 3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ms_oil_2t_packets INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ms_other_lubes NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hsd_oil_2t_packets INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hsd_other_lubes NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ms_cash_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hsd_cash_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ms_phonepe_paytm NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hsd_phonepe_paytm NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ms_pos_cards NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hsd_pos_cards NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ms_credit_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hsd_credit_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ms_expense_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hsd_expense_rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ms_pump_boy TEXT,
  ADD COLUMN IF NOT EXISTS hsd_pump_boy TEXT;

UPDATE day_closings
SET
  ms_oil_2t_packets = COALESCE(oil_2t_packets, 0),
  ms_other_lubes = COALESCE(other_lubes, 0),
  ms_cash_rows = COALESCE(cash_rows, '[]'::jsonb),
  ms_phonepe_paytm = COALESCE(phonepe_paytm, 0),
  ms_pos_cards = COALESCE(pos_cards, 0),
  ms_credit_rows = CASE
    WHEN COALESCE(credits, 0) > 0 THEN jsonb_build_array(
      jsonb_build_object('id', '1', 'description', '', 'amount', credits)
    )
    ELSE '[]'::jsonb
  END,
  ms_expense_rows = CASE
    WHEN COALESCE(cash_expenses, 0) > 0 THEN jsonb_build_array(
      jsonb_build_object('id', '1', 'description', '', 'amount', cash_expenses)
    )
    ELSE '[]'::jsonb
  END;

ALTER TABLE day_closings
  DROP COLUMN IF EXISTS oil_2t_packets,
  DROP COLUMN IF EXISTS other_lubes,
  DROP COLUMN IF EXISTS cash_rows,
  DROP COLUMN IF EXISTS phonepe_paytm,
  DROP COLUMN IF EXISTS pos_cards,
  DROP COLUMN IF EXISTS credits,
  DROP COLUMN IF EXISTS cash_expenses;
