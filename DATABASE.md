# Database Schema

**Platform:** Supabase PostgreSQL  
**Project:** IOCL-Invoice Project (`qvrfonbultntaajayzxh`)

## Tables

### invoices

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| invoice_number | TEXT | |
| invoice_date | DATE | |
| supplier_name | TEXT | |
| supplier_code | TEXT | |
| consignee_name | TEXT | |
| payer_name | TEXT | |
| delivery_number | TEXT | |
| sales_order_number | TEXT | |
| po_reference | TEXT | |
| sap_entry_number | TEXT | |
| transport_number | TEXT | |
| invoice_total | NUMERIC(14,2) | |
| rounding_difference | NUMERIC(14,2) | |
| pdf_storage_path | TEXT | Path in invoice-pdfs bucket |
| source_type | TEXT | e.g. MANUAL_UPLOAD |
| source_message_id | TEXT | For future Gmail |
| status | TEXT | See state machine |
| content_hash | TEXT | Optional duplicate fallback |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | Auto-updated via trigger |

### invoice_line_items

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| invoice_id | UUID FK → invoices | ON DELETE CASCADE |
| material_code | TEXT | |
| product | TEXT | |
| quantity | NUMERIC(14,3) | Original unit qty |
| unit | TEXT | e.g. KL |
| rate | NUMERIC(14,4) | |
| hsn_code | TEXT | |
| invoice_value | NUMERIC(14,2) | |
| output_quantity | NUMERIC(14,3) | Converted qty |
| output_measure | TEXT | e.g. Litres |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### processing_jobs

Batch upload tracking: job_type, status, file counts, created_by, timestamps.

### processing_job_items

Per-file progress within a job: filename, storage_path, invoice_id, status, progress, error_message.

### extraction_results

Audit trail: invoice_id, provider, provider_version, raw_response (JSONB), normalized_data (JSONB), confidence (JSONB).

## Indexes

- `idx_invoices_supplier_invoice` — UNIQUE partial on `(supplier_name, invoice_number)` WHERE both NOT NULL
- `idx_invoices_date` — `invoice_date`
- `idx_invoices_status` — `status`
- FK indexes on all foreign keys

## Duplicate Detection

1. Primary: `supplier_name + invoice_number` (unique partial index)
2. Fallback: `content_hash` + `source_message_id`
3. Never rely on uploaded filename alone

## RLS Strategy

**V1:** Single-tenant — authenticated users can SELECT, INSERT, UPDATE, DELETE on all tables.

**Phase 8:** Production policies with explicit SELECT policies for UPDATE operations.

## Storage

- Bucket: `invoice-pdfs` (private)
- Path pattern: `YYYY/MM/{invoice-id}.pdf`

## Migrations

All schema changes via versioned files in `ioc-invoice-app/supabase/migrations/`, applied via Supabase MCP `apply_migration`.
