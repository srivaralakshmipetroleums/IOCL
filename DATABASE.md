# Database Schema

**Platform:** Supabase PostgreSQL  
**Project:** IOCL-Invoice Project (`qvrfonbultntaajayzxh`)

## Tables

### invoices

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| invoice_number | TEXT | IOCL SAP entry / billing doc (10-digit). Same as PAD billing doc and Excel BILL NO. |
| invoice_date | DATE | |
| supplier_name | TEXT | |
| supplier_code | TEXT | |
| consignee_name | TEXT | |
| payer_name | TEXT | |
| delivery_number | TEXT | |
| sales_order_number | TEXT | |
| po_reference | TEXT | |
| sap_entry_number | TEXT | Same SAP billing number as invoice_number |
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

### pad_statements

IOCL PAD (Price Advance Deposit) ledger imports — one row per financial year export.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| fy_label | TEXT | e.g. `FY 2020-21` |
| period_from / period_to | DATE | FY range (Apr–Mar) |
| customer_name / customer_code | TEXT | Dealer identity |
| controlling_office | TEXT | |
| report_generated_at | TIMESTAMPTZ | From export metadata |
| opening_balance / closing_balance | NUMERIC(14,2) | |
| open_delivery_value | NUMERIC(14,2) | Footer summary |
| source_filename | TEXT | Original `.xls` export name |
| imported_at | TIMESTAMPTZ | Last import time |

Unique on `(period_from, period_to, customer_code)`.

### pad_transactions

Ledger lines for each PAD statement.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| statement_id | UUID FK → pad_statements | ON DELETE CASCADE |
| line_number | INTEGER | Order in source file |
| plant | TEXT | Terminal |
| item_text | TEXT | Description / UTR / margin text |
| document_type | TEXT | e.g. Billing doc.transfer, Customer ECollection |
| document_number | TEXT | SAP billing doc no. |
| transaction_date | DATE | |
| material_group | TEXT | BULK-MS, BULK-HSD |
| quantity / unit | NUMERIC / TEXT | Fuel qty in KL |
| debit / credit / balance | NUMERIC(14,2) | |
| category | TEXT | FUEL_MS, FUEL_HSD, PAYMENT, MARGIN, DISCOUNT, FEE, INTEREST, CREDIT_MEMO, SUMMARY, OTHER |

Import: `npm run import:pad` (reads `Docs/PAD/*.xls` HTML exports).

### retail_selling_prices

Historical MS/HSD retail selling prices for PAD profit calculations.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| product | TEXT | `MS` or `HSD` |
| effective_from | DATE | Price effective from this date |
| price_per_litre | NUMERIC(10,4) | ₹/litre at pump |
| notes | TEXT | Optional |
| source_message_id | TEXT | Gmail message ID when imported via RSP fetch |
| source_type | TEXT | e.g. `GMAIL` |
| created_at / updated_at | TIMESTAMPTZ | |

Unique on `(product, effective_from)`. Import: `npm run import:retail-prices` (reads `Docs/RSP/*.xlsx`) or Gmail RSP fetch on `/gmail`. Maps `MS - BS VI` → MS and `HSD - BS VI` → HSD.

### retail_price_gmail_messages

Gmail RSP fetch log. One row per processed Gmail message so re-runs skip without downloading the body. Needed because `retail_selling_prices` keeps only one `source_message_id` per product/date.

| Column | Type | Notes |
|--------|------|-------|
| message_id | TEXT PK | Gmail message ID |
| status | TEXT | `IMPORTED` or `UNPARSED` |
| processed_at | TIMESTAMPTZ | |

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
