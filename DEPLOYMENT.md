# Deployment Guide

## Prerequisites

- GitHub account
- Vercel account
- Supabase project: IOCL-Invoice Project (`qvrfonbultntaajayzxh`)

## GitHub Setup

```bash
git init
git add .
git commit -m "feat: initial IOC invoice management system"
git remote add origin https://github.com/YOUR_ORG/ioc-invoice-automation.git
git push -u origin main
```

## Vercel Deployment

1. Import the GitHub repository in Vercel
2. Set root directory to `ioc-invoice-app`
3. Configure environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://qvrfonbultntaajayzxh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase Dashboard (server-only) |
| `ANTHROPIC_API_KEY` | From Anthropic Console |

4. Deploy

## Supabase Configuration

1. Verify migrations: 5 migrations applied (initial_schema, rls_stubs, storage_bucket, rls_production, fix_function_search_path)
2. Auth → URL Configuration: add Vercel production URL to redirect URLs
3. Storage → invoice-pdfs bucket is private

## Smoke Test Checklist

- [ ] Login / signup works
- [ ] Upload sample PDF → invoice created
- [ ] Review invoice → approve
- [ ] Dashboard shows approved invoice metrics
- [ ] Excel export downloads MS HSD format file

## MCP Verification Commands

Use Supabase MCP to verify:
- `list_migrations` — 5 migrations
- `list_tables` — 5 public tables with RLS
- `get_advisors` type `security` — no critical issues
