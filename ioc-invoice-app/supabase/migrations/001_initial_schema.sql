-- Migration: initial_schema
-- Applied via Supabase MCP

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT,
  invoice_date DATE,
  supplier_name TEXT,
  supplier_code TEXT,
  consignee_name TEXT,
  payer_name TEXT,
  delivery_number TEXT,
  sales_order_number TEXT,
  po_reference TEXT,
  sap_entry_number TEXT,
  transport_number TEXT,
  invoice_total NUMERIC(14,2),
  rounding_difference NUMERIC(14,2),
  pdf_storage_path TEXT,
  source_type TEXT DEFAULT 'MANUAL_UPLOAD',
  source_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED','PROCESSING','EXTRACTED','NEEDS_REVIEW','APPROVED','FAILED','DUPLICATE','SKIPPED','REPLACED')),
  content_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  material_code TEXT,
  product TEXT,
  quantity NUMERIC(14,3),
  unit TEXT,
  rate NUMERIC(14,4),
  hsn_code TEXT,
  invoice_value NUMERIC(14,2),
  output_quantity NUMERIC(14,3),
  output_measure TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL DEFAULT 'INVOICE_UPLOAD',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED')),
  total_files INTEGER NOT NULL DEFAULT 0,
  processed_files INTEGER NOT NULL DEFAULT 0,
  successful_files INTEGER NOT NULL DEFAULT 0,
  failed_files INTEGER NOT NULL DEFAULT 0,
  skipped_files INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE processing_job_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT,
  invoice_id UUID REFERENCES invoices(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','UPLOADING','UPLOADED','PROCESSING','COMPLETED','FAILED','SKIPPED','DUPLICATE')),
  progress INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE extraction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_version TEXT,
  raw_response JSONB,
  normalized_data JSONB,
  confidence JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_invoices_supplier_invoice ON invoices (supplier_name, invoice_number) WHERE supplier_name IS NOT NULL AND invoice_number IS NOT NULL;
CREATE INDEX idx_invoices_date ON invoices (invoice_date);
CREATE INDEX idx_invoices_status ON invoices (status);
CREATE INDEX idx_line_items_invoice_id ON invoice_line_items (invoice_id);
CREATE INDEX idx_line_items_product ON invoice_line_items (product);
CREATE INDEX idx_processing_job_items_job_id ON processing_job_items (job_id);
CREATE INDEX idx_extraction_results_invoice_id ON extraction_results (invoice_id);

CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER invoice_line_items_updated_at BEFORE UPDATE ON invoice_line_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER processing_jobs_updated_at BEFORE UPDATE ON processing_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
