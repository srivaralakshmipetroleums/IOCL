# B-PRD
## Business / Product Requirements Document

**Product:** IOC Invoice Management & Reporting System  
**Version:** V1.0  
**Status:** Development Specification  
**Primary Development Tool:** Cursor  
**Frontend:** React / Next.js  
**Backend Platform:** Supabase  
**Deployment:** Vercel  
**Source Control:** GitHub

---

# 1. Product Vision

Build a simple, professional web application that allows a non-technical user to:

1. Upload IOC invoice PDFs.
2. Extract structured invoice information.
3. Review extracted information.
4. Store invoices securely.
5. Prevent duplicate invoices.
6. View invoice records in a searchable dashboard.
7. Filter and analyse invoice data.
8. Export the data in the existing Excel reporting format.
9. Eventually retrieve invoices automatically from Gmail.

The application must feel like a **business application**, not a developer tool.

The user should not need to understand Python, databases, APIs, command-line commands or AI processing.

---

# 2. V1 Scope

## Included in V1

### Invoice management

- Manual PDF upload
- Multiple PDF upload
- Drag-and-drop upload
- Invoice extraction
- Invoice validation
- Duplicate detection
- Invoice review
- Invoice storage
- Invoice search
- Invoice filtering
- Invoice details
- Original PDF viewing
- Invoice status
- Error handling

### Dashboard

- Total invoices
- Total invoice value
- Total quantity
- Product quantities
- Invoice count
- Date filtering
- Product filtering
- Supplier filtering
- Charts
- Summary cards

### Excel reporting

The application must generate the existing Excel reporting structure.

The current workbook contains a sheet named:

**MS HSD**

with the following columns:

1. DATE
2. Name of the Suppllier
3. BILL NO
4. PRODUCT
5. INVOICE VALUE
6. HSN CODE
7. QUANTITY
8. MEASURE

The spelling and column structure of the existing template should be preserved for compatibility.

---

# 3. V1 Explicitly Excluded

The following are NOT part of V1 implementation:

- Bank deposit receipt extraction
- PhonePe report extraction
- Commission report extraction
- Other financial report extraction
- Generic document processing
- Automatic classification of arbitrary Gmail documents
- Multi-document financial reconciliation
- Accounting software integration
- ERP integration
- Mobile application

However, the architecture must allow these capabilities to be added later.

---

# 4. Future Product Direction

The eventual application may become a broader financial/document reporting system.

Potential future document types:

```text
Gmail
 │
 ├── IOC Invoices
 ├── Bank Deposit Receipts
 ├── PhonePe Reports
 ├── Commission Reports
 ├── Other Reports
 └── Future Documents
```

Each document type should eventually have its own:

- extractor
- validation rules
- database model where appropriate
- dashboard/report
- processing workflow

V1 must therefore avoid hard-coding the entire system around a single invoice table or a single extraction provider.

---

# 5. Primary User

The primary user is a non-technical business user.

The user should be able to open the application and understand what to do without technical instructions.

The normal workflow should be:

```text
Open Application
      ↓
Upload Invoice PDFs
      ↓
Start Extraction
      ↓
Review Results
      ↓
Approve / Correct
      ↓
Dashboard Updated
      ↓
Export Excel
```

---

# 6. Main Navigation

The application should have:

```text
Dashboard
Invoices
Upload
Reports
Settings
```

A Gmail section can be introduced when automatic invoice retrieval is implemented.

---

# 7. Upload Workflow

## Upload page

The main upload area should display:

**Upload IOC Invoice PDFs**

with:

- Drag and drop
- Browse files
- Multiple file selection
- PDF-only validation

Example:

```text
┌─────────────────────────────────────────────┐
│                                             │
│              Upload IOC Invoices            │
│                                             │
│       Drag & Drop PDF files here            │
│                    or                       │
│              [ Browse Files ]               │
│                                             │
│              PDF files only                 │
│                                             │
└─────────────────────────────────────────────┘
```

---

# 8. Processing Workflow

After files are selected:

```text
Selected Files

invoice001.pdf       Waiting
invoice002.pdf       Waiting
invoice003.pdf       Waiting

             [ Start Extraction ]
```

During processing:

```text
invoice001.pdf       Processing
invoice002.pdf       Completed
invoice003.pdf       Waiting
```

The application should display:

- Total files
- Completed
- Processing
- Failed
- Skipped
- Progress percentage

---

# 9. Invoice Extraction

The application must extract invoice information from the PDF.

For the supplied example invoice, the document contains:

- Indian Oil Corporation Ltd
- SAP Entry No. 7009317047
- Date 31-Jul-26
- EBMS
- HSD-BSVI
- quantities
- HSN codes
- line-level totals

The invoice contains multiple product sections, demonstrating that one PDF may produce multiple invoice line items.

---

# 10. Required Invoice Information

## Invoice-level information

The system should capture:

- Invoice number / SAP Entry number
- Invoice date
- Supplier
- Supplier code where available
- Consignee where available
- Payer where available
- Delivery number where available
- Sales order where available
- PO reference where available
- Transport number where available
- Invoice total
- Original PDF
- Source
- Processing status

---

# 11. Required Line-item Information

Each invoice may contain multiple line items.

Each line item should capture:

- Material code
- Product
- Quantity
- Unit
- Rate
- HSN code
- Invoice value
- Output measure

Example products currently include:

- EBMS
- HSD-BSVI

The system must not assume that these are the only products forever.

---

# 12. Quantity Conversion

The supplied invoice uses KL.

The existing Excel reporting uses Litres.

Therefore:

```text
1 KL = 1,000 Litres
```

Example:

```text
Invoice:
EBMS = 9.000 KL

Excel:
Quantity = 9000
Measure = Litres
```

The conversion must be a deterministic application rule.

The AI extractor should not independently decide whether conversion should occur.

---

# 13. Invoice Value Logic

The application must extract line-level values independently.

For the supplied invoice:

```text
EBMS       ₹1,024,074.15
HSD-BSVI     ₹514,768.18
```

The invoice also contains a rounding difference and final invoice total.

The application must not simply divide the invoice total between products.

The original line-level values must be preserved.

---

# 14. Invoice Review

After extraction, the user should be able to review the result.

Example:

```text
Invoice #7009317047

┌───────────────────┬──────────────────────────┐
│                   │ Extracted Information    │
│                   │                          │
│   PDF Preview     │ Invoice No: 7009317047 │
│                   │ Date: 31-Jul-26         │
│                   │ Supplier: Indian Oil    │
│                   │                          │
│                   │ EBMS       9,000 L      │
│                   │ HSD-BSVI   5,000 L      │
│                   │                          │
│                   │ [Edit] [Approve]         │
└───────────────────┴──────────────────────────┘
```

The user must be able to correct extraction errors before final approval.

---

# 15. Duplicate Handling

The system must detect duplicate invoices.

If the same invoice is uploaded again:

```text
This invoice already exists.

Invoice: 7009317047

[ Skip ]    [ Replace ]
```

The default action should be **Skip**.

Replacing should require intentional user action.

---

# 16. Invoice Table

The invoice table should provide:

- Search
- Sort
- Filter
- Pagination
- Date filtering
- Product filtering
- Supplier filtering
- Status filtering
- Export

Columns should include:

- Date
- Supplier
- Bill No
- Product
- Invoice Value
- HSN Code
- Quantity
- Measure
- Source
- Status

---

# 17. Dashboard

The dashboard should display:

### KPI cards

- Total invoices
- Total invoice value
- Total quantity
- Total line items
- EBMS quantity
- HSD-BSVI quantity
- Average invoice value

### Filters

- Year
- Month
- Date range
- Product
- Supplier

### Charts

1. Invoice Value by Date
2. Quantity by Date
3. Product Quantity
4. Invoice Value by Product
5. Monthly Invoice Count

---

# 18. Excel Export

The Excel report is a critical business output.

The existing Excel format should be treated as the source of truth.

The report must preserve:

- Sheet structure
- Column names
- Data meaning
- Date format
- Number format
- Product-level rows

The main data structure is:

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

One invoice with two products should create two rows.

---

# 19. Excel Export Options

The user should be able to export:

- Current month
- Selected month
- Selected date range
- All invoices
- Current filters

The output should be downloadable directly from the browser.

---

# 20. Reports

The Reports page should eventually provide:

```text
Report Type
[ Invoice Excel Report ]

Period
[ Current Month ▼ ]

Product
[ All ▼ ]

Supplier
[ All ▼ ]

             [ Generate Report ]
```

---

# 21. PDF Management

The original PDF must be retained.

The user should be able to:

- Open PDF
- Preview PDF
- Download PDF
- View the PDF from invoice details

The database should retain the storage reference.

---

# 22. Statuses

Invoices should have clear statuses:

```text
Uploaded
Processing
Extracted
Needs Review
Approved
Failed
Duplicate
Skipped
```

The UI should use friendly language.

---

# 23. Error Handling

The user should never need to inspect backend logs.

Examples:

### Extraction failure

> Could not extract invoice data from this PDF.

Actions:

```text
[ Retry ]
[ Review PDF ]
```

### Duplicate

> This invoice already exists.

Actions:

```text
[ Skip ]
[ Replace ]
```

### Invalid PDF

> This file is not a valid invoice PDF.

---

# 24. Success Feedback

After processing:

```text
8 invoices processed successfully.

✓ 8 invoices extracted
✓ 16 line items created
✓ 0 duplicates
✓ 0 errors

[ View Invoices ]
[ Open Dashboard ]
[ Export Excel ]
```

---

# 25. V1 Success Criteria

V1 is successful when the user can:

1. Open the web application.
2. Upload one or many IOC invoice PDFs.
3. Start extraction.
4. See processing progress.
5. Extract invoice information.
6. Correct extracted information.
7. Approve invoices.
8. Search invoices.
9. Filter invoices.
10. Open original PDFs.
11. View dashboard KPIs.
12. View dashboard charts.
13. Export the invoice data to the existing Excel format.
14. Upload the same invoice again without creating a duplicate.

---

# 26. Development Phases

## Phase 0 — Product Foundation

Define:

- Final requirements
- UX
- Database entities
- Extraction schema
- Excel mapping
- Application architecture

No major UI implementation yet.

---

## Phase 1 — Project Foundation

Create:

- Next.js
- React
- TypeScript
- Tailwind
- shadcn/ui
- Supabase
- GitHub repository
- Environment configuration

Deliverable:

A running application with the basic navigation.

---

## Phase 2 — Database

Create:

- invoices
- invoice_line_items
- processing_jobs
- extraction records
- audit/status information

Implement:

- relationships
- indexes
- duplicate protection
- migrations

Deliverable:

A functioning invoice data layer.

---

## Phase 3 — Invoice Extraction

Implement:

- PDF ingestion
- extraction schema
- Claude extraction provider
- deterministic validation
- quantity conversion
- line-item extraction

Deliverable:

A supplied real invoice can be converted into validated structured data.

---

## Phase 4 — Upload

Implement:

- drag/drop
- multi-file upload
- Supabase Storage
- processing queue
- progress display
- errors
- duplicate handling

Deliverable:

User can upload and process invoices without technical commands.

---

## Phase 5 — Invoice Review

Implement:

- invoice table
- invoice details
- PDF preview
- extracted data editor
- approval
- retry
- duplicate resolution

Deliverable:

User can verify invoice data before reporting.

---

## Phase 6 — Dashboard

Implement:

- KPI cards
- filters
- charts
- invoice statistics
- product statistics
- date analysis

Deliverable:

Professional business dashboard.

---

## Phase 7 — Excel Reporting

Implement:

- exact Excel template mapping
- filtered export
- monthly export
- all-invoice export
- summary reporting
- formatting

Deliverable:

Downloaded Excel report compatible with the existing workflow.

---

## Phase 8 — Authentication & Security

Implement:

- Supabase Auth
- protected routes
- storage security
- database Row Level Security
- server-side secrets
- role structure if required

Deliverable:

Secure application suitable for deployment.

---

## Phase 9 — Vercel Deployment

Implement:

- production environment
- Vercel configuration
- Supabase production configuration
- environment variables
- GitHub integration

Deliverable:

Production web application.

---

## Phase 10 — Testing & Stabilisation

Test:

- invoice extraction
- duplicate invoices
- multiple PDFs
- quantity conversion
- Excel export
- date handling
- invalid files
- extraction failures
- database constraints
- UI responsiveness

Deliverable:

Stable V1 release.

---

# 27. Future Phases

These are intentionally **not V1 features**.

### Future Phase A — Gmail IOC Invoice Retrieval

```text
Gmail
 ↓
IOC invoice search
 ↓
PDF attachment
 ↓
Existing invoice processing pipeline
```

### Future Phase B — Bank Deposit Receipts

### Future Phase C — PhonePe Reports

### Future Phase D — Commission Reports

### Future Phase E — Other Financial Documents

Eventually:

```text
Document
   ↓
Document Type Detection
   ↓
Specific Extractor
   ↓
Specific Validation
   ↓
Specific Database/Report
```

The V1 architecture must make this possible without rewriting the invoice system.

---

# 28. Product Principle

The most important product principle is:

> **Build the foundation for a multi-document financial reporting platform, but only implement IOC invoice processing in V1.**

Do not overbuild future functionality.

Do not build fake screens for future reports.

Do not introduce unnecessary complexity.

Build a strong invoice system that can be extended later.