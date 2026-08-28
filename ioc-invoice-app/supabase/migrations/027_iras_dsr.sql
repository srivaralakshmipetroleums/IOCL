-- Migration: iras_dsr
-- Stores IRAS DSR captures (raw JSON) and parsed daily records separately.

CREATE TABLE iras_dsr_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_response JSONB NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_count INTEGER,
  first_dsr_date TEXT,
  last_dsr_date TEXT,
  record_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE iras_dsr_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id UUID NOT NULL REFERENCES iras_dsr_captures(id) ON DELETE CASCADE,
  dsr_date TEXT NOT NULL,
  record_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (dsr_date)
);

CREATE INDEX idx_iras_dsr_captures_captured_at
  ON iras_dsr_captures (captured_at DESC);

CREATE INDEX idx_iras_dsr_records_dsr_date
  ON iras_dsr_records (dsr_date);

ALTER TABLE iras_dsr_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE iras_dsr_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_iras_dsr_captures"
  ON iras_dsr_captures FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_iras_dsr_captures"
  ON iras_dsr_captures FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_select_iras_dsr_records"
  ON iras_dsr_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_iras_dsr_records"
  ON iras_dsr_records FOR INSERT TO authenticated WITH CHECK (true);
