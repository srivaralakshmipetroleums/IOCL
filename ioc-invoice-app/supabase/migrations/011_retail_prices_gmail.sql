-- Migration: retail_selling_prices gmail provenance
-- Track Gmail message IDs for RSP fetch dedup

ALTER TABLE retail_selling_prices
  ADD COLUMN IF NOT EXISTS source_message_id TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT;

CREATE INDEX IF NOT EXISTS idx_retail_selling_prices_source_message
  ON retail_selling_prices (source_message_id)
  WHERE source_message_id IS NOT NULL;
