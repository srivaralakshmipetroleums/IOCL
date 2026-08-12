# Gmail Invoice Fetch — V1 Requirement

## Gmail Invoice Identification Rules

The application must identify IOC invoice emails using the following criteria:

| Setting | Value |
|---|---|
| **Sender** | `B2BPRD@indianoil.in` |
| **Subject contains** | `AC4 Inv.-` |
| **Attachment required** | Yes |
| **Attachment type** | PDF |

These values come directly from the original project requirements.

## Gmail Search

When the user selects a year and month, the application should construct the Gmail search using:

```text
from:B2BPRD@indianoil.in
subject:"AC4 Inv.-"
has:attachment
after:YYYY/MM/01
before:YYYY/MM/01
```

The `before:` date must always be the **first day of the following month**.

### Example — July 2026

```text
from:B2BPRD@indianoil.in subject:"AC4 Inv.-" has:attachment after:2026/07/01 before:2026/08/01
```

### Example — December 2026

```text
from:B2BPRD@indianoil.in subject:"AC4 Inv.-" has:attachment after:2026/12/01 before:2027/01/01
```

## Gmail Fetch Workflow

```text
User selects Year + Month
        ↓
Build Gmail search query
        ↓
Search Gmail
        ↓
Filter matching emails
        ↓
Download PDF attachments
        ↓
Create invoice processing jobs
        ↓
Send PDFs through existing Invoice Extraction pipeline
        ↓
Validate / detect duplicates
        ↓
Store invoice + line items
        ↓
Show processing results
```

## User Interface

The Gmail page should show:

```text
Gmail Connection

🟢 Connected

Year
[ 2026 ▼ ]

Month
[ July ▼ ]

[ Fetch Invoices ]

────────────────────────────

Searching Gmail...

8 emails found
8 PDFs downloaded
16 line items extracted
8 invoices completed
0 errors

████████████████████ 100%
```

## Configuration

The sender and subject should be **configuration values**, not scattered or hard-coded throughout the application.

For V1:

```env
GMAIL_INVOICE_SENDER=B2BPRD@indianoil.in
GMAIL_INVOICE_SUBJECT=AC4 Inv.-
GMAIL_INVOICE_REQUIRE_ATTACHMENT=true
```

The Gmail functionality itself can remain a later implementation phase, but these are the **official V1 IOC invoice Gmail identification rules**.
