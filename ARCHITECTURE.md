# Architecture

## Layers

```
UI (React/Next.js)
    ↓
API Routes (Next.js server)
    ↓
Application Services (lib/)
    ↓
Business Logic (validation, duplicates, conversions)
    ↓
Database / External APIs (Supabase, Claude)
```

**Core principle:** AI is an extraction service only. TypeScript owns business rules, status, duplicates, reports, and security.

## Data Flow — Upload to Approval

```
User uploads PDFs
    → Supabase Storage (invoice-pdfs bucket)
    → processing_jobs + processing_job_items created
    → API triggers extraction per file
    → ClaudeInvoiceExtractor returns structured JSON
    → Zod validation + quantity conversion (KL → Litres)
    → Duplicate check (supplier + invoice_number)
    → Persist invoice + line_items + extraction_results
    → Status: EXTRACTED or NEEDS_REVIEW or DUPLICATE or FAILED
    → User reviews in UI
    → Approve → status APPROVED
    → Dashboard + Excel use APPROVED records only
```

## Invoice State Machine

```
UPLOADED → PROCESSING → EXTRACTED → NEEDS_REVIEW → APPROVED
                ↓              ↓
              FAILED        DUPLICATE → SKIPPED / REPLACED
                ↓
              RETRY
```

## Extraction Abstraction

```typescript
interface InvoiceExtractor {
  extract(input: InvoiceInput): Promise<ExtractedInvoice>;
}
```

Providers:
- `ClaudeInvoiceExtractor` — production
- `LocalInvoiceExtractor` — tests/dev

## Key Services

| Service | Responsibility |
|---------|----------------|
| `ProcessingService` | Orchestrate upload → extract → persist |
| `DuplicateService` | Detect duplicates; handle replace |
| `InvoiceRepository` | CRUD for invoices and line items |
| `ExcelReportService` | Generate MS HSD workbook from DB |
| `QuantityConverter` | KL → Litres (deterministic) |

## Realtime Progress

```
processing_job_items status update (Postgres)
    → Supabase Realtime subscription
    → Upload UI progress bar
```

## Security Model (V1)

- Single-tenant: all authenticated users share data
- RLS enabled on all public tables
- Private storage bucket; signed URLs for PDF viewing
- Service role key and Anthropic key server-only

## Future Extensibility

Document types (Gmail, bank deposits, etc.) will use separate extractors implementing `DocumentExtractor<T>`. V1 implements `InvoiceExtractor` only.
