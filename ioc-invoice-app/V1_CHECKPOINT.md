# V1 Checkpoint — Invoice Dashboard

**Tag:** `v1.0-invoice-dashboard`  
**Date:** 2026-08-15

## Confirmed working

- Invoice dashboard (period filters, KPIs, charts, line items table)
- Invoice listing and search (including date search)
- Invoice extraction (Claude PDF extraction, Gmail fetch)
- Invoice review (detail view, edit, approve, delete)
- Invoice data storage (Supabase schema and repositories)
- Dashboard calculations (fuel product filters, status filters, date handling)
- Excel report generation (MS HSD format, styling, totals, naming)
- Excel column mapping (`lib/excel/report-format.ts`, `EXCEL_MAPPING.md`)
- Supabase database and migrations
- Authentication and `requireAuth()` on API routes

## Regression policy

Do not modify working invoice/report functionality unless:

1. Fixing a specific, confirmed bug, or
2. Implementing an explicitly requested future integration

When changes are required:

- Keep diffs minimal and scoped
- Preserve Excel column names, order, and report structure
- Preserve dashboard status filters (`EXTRACTED`, `NEEDS_REVIEW`, `APPROVED`)
- Preserve fuel-only product filtering (EBMS, HSD-BSVI) for charts and reports
- Run `npm test` and `npm run build` before finishing

## Key paths

- `lib/excel/`
- `lib/dashboard/`
- `lib/invoices/`
- `app/api/dashboard/`
- `app/api/invoices/`
- `app/api/reports/`
- `components/dashboard/`
- `components/invoices/`
- `components/reports/`
- `lib/auth/require-auth.ts`
- `supabase/`

## Restore this checkpoint

```bash
git checkout v1.0-invoice-dashboard
```
