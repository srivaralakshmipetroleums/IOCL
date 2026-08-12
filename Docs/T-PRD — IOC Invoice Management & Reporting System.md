# T-PRD
## Technical Product Requirements Document

**Project:** IOC Invoice Management & Reporting System  
**Version:** V1.0  
**Architecture:** Next.js + React + TypeScript + Supabase  
**Deployment:** Vercel  
**Development:** Cursor + Claude  
**Repository:** GitHub

---

# 1. Technical Objective

Build a production-quality invoice management application from scratch.

The application must:

- process IOC invoice PDFs
- extract structured information
- store invoices in PostgreSQL
- retain original PDFs
- prevent duplicates
- support human review
- provide dashboard analytics
- generate Excel reports
- be deployable on Vercel
- be extensible to additional document types in future

---

# 2. Technology Stack

## Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
```

Recommended supporting libraries:

```text
TanStack Query
TanStack Table
React Hook Form
Zod
Recharts
Lucide Icons
```

---

# 3. Backend

Use the Next.js server-side layer for application APIs and server operations where practical.

Use Supabase for:

```text
PostgreSQL
Authentication
Storage
Realtime
Row Level Security
```

Use Supabase Edge Functions where background/serverless processing is more appropriate.

Do not introduce a separate FastAPI server in V1 unless a concrete technical requirement emerges.

---

# 4. Database

Use:

**Supabase PostgreSQL**

Do not use SQLite in production.

The database schema must be migration-based.

All schema changes must be represented in version-controlled migrations.

---

# 5. Storage

Use:

**Supabase Storage**

Suggested bucket:

```text
invoice-pdfs
```

Suggested logical structure:

```text
invoice-pdfs/
    2026/
        07/
            <invoice-id>.pdf
```

The exact physical filename should not be treated as the invoice number because invoice numbers can potentially be corrected or duplicated.

---

# 6. Database Schema

## invoices

Suggested fields:

```text
id UUID PRIMARY KEY

invoice_number TEXT
invoice_date DATE

supplier_name TEXT
supplier_code TEXT

consignee_name TEXT
payer_name TEXT

delivery_number TEXT
sales_order_number TEXT
po_reference TEXT
sap_entry_number TEXT
transport_number TEXT

invoice_total NUMERIC(14,2)
rounding_difference NUMERIC(14,2)

pdf_storage_path TEXT

source_type TEXT
source_message_id TEXT

status TEXT

created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

---

# 7. invoice_line_items

```text
id UUID PRIMARY KEY

invoice_id UUID REFERENCES invoices(id)

material_code TEXT
product TEXT

quantity NUMERIC(14,3)
unit TEXT

rate NUMERIC(14,4)

hsn_code TEXT

invoice_value NUMERIC(14,2)

output_quantity NUMERIC(14,3)
output_measure TEXT

created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

The distinction between original quantity/unit and output quantity/measure is intentional.

Example:

```text
Original:
quantity = 9
unit = KL

Output:
output_quantity = 9000
output_measure = Litres
```

---

# 8. processing_jobs

```text
id UUID PRIMARY KEY

job_type TEXT

status TEXT

total_files INTEGER
processed_files INTEGER
successful_files INTEGER
failed_files INTEGER
skipped_files INTEGER

started_at TIMESTAMPTZ
completed_at TIMESTAMPTZ

created_by UUID

error_message TEXT

created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

---

# 9. processing_job_items

Recommended for multi-file processing:

```text
id UUID PRIMARY KEY

job_id UUID REFERENCES processing_jobs(id)

filename TEXT
storage_path TEXT

invoice_id UUID

status TEXT

progress INTEGER

error_message TEXT

started_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
```

This allows the frontend to display per-file progress.

---

# 10. extraction_results

Recommended for auditability:

```text
id UUID PRIMARY KEY

invoice_id UUID

provider TEXT

provider_version TEXT

raw_response JSONB

normalized_data JSONB

confidence JSONB

created_at TIMESTAMPTZ
```

The raw AI response should not be treated as the authoritative invoice record.

The normalized database record is authoritative.

---

# 11. Duplicate Detection

Duplicate detection must not depend solely on the uploaded filename.

Preferred hierarchy:

```text
1. Supplier + invoice/SAP number
2. Document/source identifiers
3. Content hash where useful
```

Create appropriate unique indexes.

For example:

```text
supplier + invoice_number
```

should normally identify the same invoice.

However, the implementation should allow for cases where invoice number is unavailable.

---

# 12. Invoice State Machine

Suggested states:

```text
UPLOADED
    ↓
PROCESSING
    ↓
EXTRACTED
    ↓
NEEDS_REVIEW
    ↓
APPROVED
```

Error branch:

```text
PROCESSING
    ↓
FAILED
    ↓
RETRY
```

Duplicate branch:

```text
EXTRACTED
    ↓
DUPLICATE
    ↓
SKIPPED / REPLACED
```

---

# 13. Extraction Architecture

Do not couple the application directly to Claude.

Create an abstraction:

```typescript
interface InvoiceExtractor {
  extract(input: InvoiceInput): Promise<ExtractedInvoice>;
}
```

Providers:

```text
ClaudeInvoiceExtractor
LocalInvoiceExtractor
```

Future:

```text
OtherInvoiceExtractor
```

---

# 14. Extraction Schema

The AI should return structured JSON.

Conceptually:

```json
{
  "invoice": {
    "invoice_number": "...",
    "invoice_date": "...",
    "supplier_name": "...",
    "supplier_code": "...",
    "consignee_name": "...",
    "payer_name": "...",
    "delivery_number": "...",
    "sales_order_number": "...",
    "po_reference": "...",
    "sap_entry_number": "...",
    "transport_number": "...",
    "invoice_total": 0,
    "rounding_difference": 0
  },
  "line_items": [
    {
      "material_code": "...",
      "product": "...",
      "quantity": 0,
      "unit": "...",
      "rate": 0,
      "hsn_code": "...",
      "invoice_value": 0
    }
  ]
}
```

Use Zod to validate the result before database insertion.

---

# 15. AI Responsibility

Claude should perform:

- document understanding
- field identification
- line-item identification
- OCR interpretation where necessary
- extraction of values

Claude should NOT be responsible for:

- duplicate detection
- quantity conversion rules
- database IDs
- invoice status
- report calculations
- security
- authorization
- business-critical deterministic calculations

---

# 16. Deterministic Business Rules

Implement business rules in TypeScript.

Example:

```text
if unit === "KL":

    output_quantity = quantity * 1000
    output_measure = "Litres"
```

Do not ask the AI to perform this conversion.

Similarly, Excel report calculations must be generated from database values, not regenerated by AI.

---

# 17. Excel Mapping

The existing workbook is the reporting source of truth.

Output columns:

```text
DATE
Name of the Suppllier
BILL NO
PRODUCT
INVOICE VALUE
HSN CODE
QUANTITY
MEASURE
```

Mapping:

```text
DATE
→ invoice.invoice_date

Name of the Suppllier
→ invoice.supplier_name

BILL NO
→ invoice.invoice_number

PRODUCT
→ invoice_line_items.product

INVOICE VALUE
→ invoice_line_items.invoice_value

HSN CODE
→ invoice_line_items.hsn_code

QUANTITY
→ invoice_line_items.output_quantity

MEASURE
→ invoice_line_items.output_measure
```

---

# 18. Excel Generation

The exporter should be implemented as an independent service:

```text
ExcelReportService
```

Example:

```typescript
generateInvoiceReport(filters)
```

The service should:

1. Apply filters.
2. Retrieve approved invoice line items.
3. Transform database fields into Excel fields.
4. Create workbook.
5. Apply template formatting.
6. Add summary if required by the final template.
7. Generate downloadable file.

---

# 19. Dashboard API

Dashboard data should be calculated server-side.

Example endpoints/functions:

```text
GET /api/dashboard/summary

GET /api/dashboard/value-by-date

GET /api/dashboard/quantity-by-date

GET /api/dashboard/product-quantity

GET /api/dashboard/product-value

GET /api/dashboard/monthly-count
```

The frontend should not load all invoices simply to calculate dashboard statistics.

---

# 20. Invoice API

Suggested API structure:

```text
GET    /api/invoices
GET    /api/invoices/:id
POST   /api/invoices
PATCH  /api/invoices/:id
DELETE /api/invoices/:id

POST   /api/invoices/:id/approve
POST   /api/invoices/:id/retry
POST   /api/invoices/:id/replace
```

---

# 21. Upload API

Suggested workflow:

```text
POST /api/upload/create-job
POST /api/upload/files
POST /api/upload/start
GET  /api/upload/jobs/:id
GET  /api/upload/jobs/:id/items
```

Where possible, files should be uploaded directly to Supabase Storage rather than passing large PDF files unnecessarily through the application server.

---

# 22. Frontend Pages

Suggested structure:

```text
/
├── dashboard
├── invoices
│   └── [id]
├── upload
├── reports
└── settings
```

Future:

```text
/gmail
```

---

# 23. Component Structure

Suggested:

```text
components/
├── layout/
├── dashboard/
├── invoices/
├── upload/
├── reports/
├── pdf/
├── ui/
└── shared/
```

---

# 24. Dashboard Components

```text
DashboardPage
├── DashboardHeader
├── FilterBar
├── KpiGrid
│   ├── InvoiceCountCard
│   ├── InvoiceValueCard
│   ├── QuantityCard
│   └── LineItemCard
├── InvoiceValueChart
├── QuantityChart
├── ProductQuantityChart
├── ProductValueChart
└── MonthlyInvoiceChart
```

---

# 25. Invoice Components

```text
InvoiceTable
InvoiceFilters
InvoiceStatusBadge
InvoiceDetails
InvoiceLineItems
InvoicePdfViewer
InvoiceEditForm
InvoiceReviewPanel
DuplicateDialog
```

---

# 26. Upload Components

```text
InvoiceDropzone
FileQueue
ProcessingProgress
ProcessingSummary
ProcessingError
UploadComplete
```

---

# 27. UI Principles

The application must be:

- responsive
- clean
- professional
- fast
- simple
- accessible
- consistent

Use:

- cards
- tables
- badges
- dialogs
- toast notifications
- progress indicators
- skeleton loaders
- empty states
- confirmation dialogs

Avoid unnecessary animations.

---

# 28. Supabase Security

Never expose:

- Claude API key
- Gmail credentials
- service-role Supabase key
- private storage credentials

The browser may use the Supabase anon/publishable key according to Supabase's security model, but all sensitive operations must be protected by server-side authorization and Row Level Security.

---

# 29. Environment Variables

Example:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

ANTHROPIC_API_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

Secrets must never be committed to GitHub.

Provide:

```text
.env.example
```

with values removed.

---

# 30. Authentication

V1 should support Supabase authentication before production deployment.

At minimum:

```text
Login
Logout
Protected dashboard
Protected invoices
Protected upload
Protected reports
Protected settings
```

---

# 31. Storage Security

PDFs should not be publicly accessible by default.

Use authenticated access or signed URLs.

The database should store the storage path, not expose internal storage credentials.

---

# 32. Realtime Processing

The UI should be able to see processing progress.

Preferred approach:

```text
Processing Job
      ↓
Supabase database status update
      ↓
Realtime subscription / polling
      ↓
React UI
```

Example:

```text
12 / 20 processed

████████████░░░░░░░░ 60%
```

---

# 33. Gmail Architecture — Future Phase

Do not implement additional Gmail document types in V1.

When Gmail invoice ingestion is introduced:

```text
Gmail API
   ↓
Search
   ↓
Download attachment
   ↓
Supabase Storage
   ↓
Existing invoice processing pipeline
```

The invoice processor should not care whether its source was:

```text
Manual Upload
```

or:

```text
Gmail
```

---

# 34. Gmail Date Logic

When Gmail invoice retrieval is implemented, the month range must use:

```text
after:first_day_of_month
before:first_day_of_next_month
```

Example:

```text
July 2026

after:2026/07/01
before:2026/08/01
```

December must correctly cross the year boundary:

```text
after:2026/12/01
before:2027/01/01
```

This requirement is explicitly defined in the product specification.

This logic should have automated tests.

---

# 35. Future Document Architecture

The application should eventually support:

```text
DocumentType
    │
    ├── IOC_INVOICE
    ├── BANK_DEPOSIT
    ├── PHONEPE_REPORT
    ├── COMMISSION_REPORT
    └── OTHER
```

Future architecture:

```typescript
interface DocumentExtractor<T> {
  extract(input: DocumentInput): Promise<T>;
}
```

For V1, implement only:

```text
InvoiceExtractor
```

Do not implement placeholder extractors for future documents.

---

# 36. Testing Strategy

## Unit tests

Test:

- quantity conversion
- invoice validation
- duplicate detection
- date normalization
- Excel mapping
- invoice calculations

## Extraction tests

Use supplied real invoice examples.

Expected:

```text
Invoice:
7009317047

Date:
31-Jul-26

Products:
EBMS
HSD-BSVI

Quantities:
9 KL
5 KL

Output:
9000 Litres
5000 Litres
```

The invoice visually and textually confirms these fields. 
---

# 37. Excel Tests

Verify:

- correct sheet
- correct columns
- correct date
- correct invoice number
- correct product
- correct line value
- correct HSN
- correct quantity conversion
- correct measure

For example:

```text
EBMS
1024074.15
2710 12 42
9000
Litres
```

and:

```text
HSD-BSVI
514768.18
2710 19 44
5000
Litres
```

---

# 38. Duplicate Tests

Test:

```text
Upload invoice once
→ Created

Upload same invoice again
→ Duplicate detected
→ No second invoice
```

Test:

```text
Duplicate
→ Replace
→ Existing invoice intentionally reprocessed
```

---

# 39. Upload Tests

Test:

- one PDF
- multiple PDFs
- invalid PDF
- empty upload
- duplicate PDF
- failed extraction
- retry
- large batch

---

# 40. Security Tests

Verify:

- unauthenticated users cannot access invoices
- unauthenticated users cannot upload
- users cannot access another user's private data if multi-user access is enabled
- API keys never reach browser
- service role key never reaches browser
- private PDFs cannot be accessed without authorization

---

# 41. Git Strategy

Repository:

```text
GitHub
   │
   ├── main
   └── development branches
```

Use small commits.

Examples:

```text
feat: add invoice database schema
feat: add invoice upload
feat: add Claude extraction
feat: add invoice review
feat: add dashboard
feat: add Excel export
fix: correct KL to litre conversion
fix: prevent duplicate invoices
```

Do not allow Cursor to make enormous unreviewed commits.

---

# 42. Cursor Development Rules

Cursor must:

1. Inspect existing project files before modifying them.
2. Make small changes.
3. Explain significant architectural decisions.
4. Run tests after changes.
5. Never invent database columns without updating migrations.
6. Never expose secrets.
7. Never hard-code API keys.
8. Never bypass validation.
9. Never modify the Excel mapping without explicit instruction.
10. Never remove working functionality to simplify implementation.
11. Prefer reusable services/components.
12. Keep business logic separate from UI.
13. Keep AI extraction separate from deterministic business rules.

---

# 43. Recommended Repository Structure

```text
ioc-invoice-app/

├── app/
│   ├── dashboard/
│   ├── invoices/
│   │   └── [id]/
│   ├── upload/
│   ├── reports/
│   ├── settings/
│   ├── login/
│   └── api/
│
├── components/
│   ├── dashboard/
│   ├── invoices/
│   ├── upload/
│   ├── reports/
│   ├── pdf/
│   ├── layout/
│   └── ui/
│
├── lib/
│   ├── supabase/
│   ├── extraction/
│   ├── invoices/
│   ├── reports/
│   ├── excel/
│   ├── validation/
│   └── utils/
│
├── types/
│
├── supabase/
│   ├── migrations/
│   └── functions/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── public/
│
├── .env.example
├── package.json
├── tsconfig.json
├── README.md
└── vercel.json
```

---

# 44. Phase-by-Phase Technical Implementation

## Phase 0 — Architecture

Deliver:

```text
README.md
ARCHITECTURE.md
DATABASE.md
EXTRACTION.md
EXCEL_MAPPING.md
```

No unnecessary implementation.

---

## Phase 1 — Foundation

Implement:

- Next.js
- TypeScript
- Tailwind
- shadcn/ui
- Supabase client
- authentication foundation
- navigation
- environment configuration

Acceptance:

Application runs locally.

---

## Phase 2 — Database

Implement migrations for:

- invoices
- invoice_line_items
- processing_jobs
- processing_job_items
- extraction_results

Acceptance:

Database can create and retrieve an invoice with multiple line items.

---

## Phase 3 — Extraction

Implement:

```text
PDF
 ↓
ClaudeExtractor
 ↓
Zod validation
 ↓
Normalized Invoice
```

Acceptance:

Supplied invoice can be extracted correctly.

---

## Phase 4 — Upload

Implement:

```text
Browser
 ↓
Supabase Storage
 ↓
Processing Job
 ↓
Extraction
 ↓
Database
```

Acceptance:

Multiple PDFs can be uploaded and processed.

---

## Phase 5 — Review

Implement:

```text
Invoice List
Invoice Details
PDF Viewer
Edit
Approve
Retry
Duplicate handling
```

Acceptance:

User can verify and approve extracted information.

---

## Phase 6 — Dashboard

Implement:

```text
KPI
Charts
Filters
Invoice table
```

Acceptance:

Dashboard statistics correspond to database records.

---

## Phase 7 — Excel

Implement:

```text
Database
 ↓
ExcelReportService
 ↓
Template-compatible workbook
 ↓
Download
```

Acceptance:

Export matches the supplied Excel reporting structure.

---

## Phase 8 — Production Security

Implement:

- authentication
- RLS
- private storage
- secure server-side operations
- environment variables

Acceptance:

Security checks pass.

---

## Phase 9 — Deployment

```text
GitHub
 ↓
Vercel
 ↓
Supabase Production
```

Acceptance:

Production application works without local dependencies.

---

## Phase 10 — Hardening

Implement:

- error monitoring
- logging
- retry handling
- loading states
- empty states
- responsive UI
- performance improvements
- test coverage

Acceptance:

V1 is production-ready.

---

# 45. Future Technical Phases

After V1:

## Phase 11 — Gmail Invoice Integration

Only IOC invoice emails initially.

## Phase 12 — Bank Deposit Extraction

Separate extractor and data model.

## Phase 13 — PhonePe

Separate report processor.

## Phase 14 — Commission Reports

Separate report processor.

## Phase 15 — Document Classification

Automatically determine:

```text
Invoice
Bank Receipt
PhonePe
Commission
Other
```

Only introduce this once the individual workflows are stable.

---

# 46. Technical Definition of Done

V1 is technically complete when:

- application builds successfully
- TypeScript passes
- tests pass
- Supabase migrations work
- authentication works
- PDF upload works
- multiple PDFs work
- Claude extraction works
- invoice validation works
- duplicate detection works
- invoice review works
- PDF preview works
- dashboard works
- Excel export works
- secrets are protected
- RLS is configured
- Vercel deployment works
- README is complete

---

# 47. Core Architectural Principle

The application should follow this separation:

```text
UI
 ↓
Application Services
 ↓
Business Logic
 ↓
Database / External APIs
```

AI should be treated as an **extraction service**, not as the application's business logic.

This is particularly important because the application will eventually grow beyond invoices.

---

# 48. V1 Boundary

Do not build:

```text
Bank
PhonePe
Commission
Generic Gmail documents
```

yet.

Build:

```text
IOC Invoice
      ↓
Extraction
      ↓
Validation
      ↓
Review
      ↓
Database
      ↓
Dashboard
      ↓
Excel
```

Make that workflow excellent first.