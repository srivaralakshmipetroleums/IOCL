-- Migration: iras_dsr_product
-- Store product (MS/HSD) per capture and per daily record so MS and HSD do not collide.

ALTER TABLE iras_dsr_captures
  ADD COLUMN product TEXT,
  ADD COLUMN report_month INTEGER,
  ADD COLUMN report_year INTEGER;

ALTER TABLE iras_dsr_records
  ADD COLUMN product TEXT;

ALTER TABLE iras_dsr_records
  DROP CONSTRAINT IF EXISTS iras_dsr_records_dsr_date_key;

CREATE UNIQUE INDEX idx_iras_dsr_records_dsr_date_product
  ON iras_dsr_records (dsr_date, product);

CREATE INDEX idx_iras_dsr_captures_product_period
  ON iras_dsr_captures (report_year, report_month, product, captured_at DESC);

CREATE INDEX idx_iras_dsr_records_product
  ON iras_dsr_records (product, dsr_date);
