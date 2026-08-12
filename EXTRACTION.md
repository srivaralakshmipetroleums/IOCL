# Extraction Pipeline

## Interface

```typescript
interface InvoiceInput {
  pdfBuffer: Buffer;
  filename: string;
}

interface ExtractedInvoice {
  invoice: InvoiceHeader;
  line_items: LineItem[];
}

interface InvoiceExtractor {
  extract(input: InvoiceInput): Promise<ExtractedInvoice>;
}
```

## Providers

| Provider | Use case |
|----------|----------|
| `ClaudeInvoiceExtractor` | Production — calls Anthropic API |
| `LocalInvoiceExtractor` | Tests — returns fixture data |

## Claude Extraction Flow

1. Read PDF as base64
2. Send to Claude with structured extraction prompt
3. Parse JSON response
4. Validate with Zod schema
5. Apply deterministic post-processing (quantity conversion, date normalization)
6. Return normalized result

## Expected JSON Shape

```json
{
  "invoice": {
    "invoice_number": "7009317047",
    "invoice_date": "2026-07-31",
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
      "product": "EBMS",
      "quantity": 9,
      "unit": "KL",
      "rate": 0,
      "hsn_code": "2710 12 42",
      "invoice_value": 1024074.15
    }
  ]
}
```

## AI Responsibilities

- Document understanding
- Field identification
- Line-item identification
- OCR interpretation

## NOT AI Responsibilities

- Duplicate detection
- Quantity conversion (KL → Litres)
- Database IDs
- Invoice status
- Report calculations
- Security / authorization

## Quantity Conversion (TypeScript)

```
if unit === "KL":
    output_quantity = quantity * 1000
    output_measure = "Litres"
```

## Validation

All extraction output validated via Zod before database insert. Invalid responses → FAILED status with error stored in processing_job_items.

## Audit Trail

Raw Claude response stored in `extraction_results.raw_response`. Normalized data in `extraction_results.normalized_data`. Database invoice record is authoritative.

## Test Fixture (Invoice 7009317047)

| Product | Qty | Unit | Output Qty | Measure | Value | HSN |
|---------|-----|------|------------|---------|-------|-----|
| EBMS | 9 | KL | 9000 | Litres | 1024074.15 | 2710 12 42 |
| HSD-BSVI | 5 | KL | 5000 | Litres | 514768.18 | 2710 19 44 |
