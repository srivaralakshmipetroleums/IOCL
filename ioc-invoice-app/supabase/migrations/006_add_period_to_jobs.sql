-- Migration: add_period_to_jobs

ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS period_label TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_content_hash ON invoices (content_hash) WHERE content_hash IS NOT NULL;
