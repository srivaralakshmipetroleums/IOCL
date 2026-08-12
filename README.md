# IOC Invoice Management & Reporting System

Web application for uploading IOC invoice PDFs, extracting structured data with AI, human review, dashboard analytics, and Excel export.

## Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes
- **Database:** Supabase PostgreSQL
- **Auth & Storage:** Supabase Auth + Storage
- **AI Extraction:** Anthropic Claude (server-side only)
- **Deployment:** Vercel

## Prerequisites

- Node.js 20+
- Supabase project (IOCL-Invoice Project)
- Anthropic API key (for PDF extraction)

## Setup

```bash
cd ioc-invoice-app
npm install
cp .env.example .env.local
# Fill in .env.local with your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service role key |
| `ANTHROPIC_API_KEY` | Claude API key (server-only) |

See `.env.example` for the full list.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run test` | Run unit tests |
| `npm run lint` | ESLint |

## Project Structure

```
ioc-invoice-app/
├── app/              # Pages and API routes
├── components/       # React components
├── lib/              # Business logic and services
├── types/            # TypeScript types
├── supabase/         # Database migrations
└── tests/            # Unit and integration tests
```

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — System design and data flow
- [DATABASE.md](DATABASE.md) — Schema and RLS
- [EXTRACTION.md](EXTRACTION.md) — AI extraction pipeline
- [EXCEL_MAPPING.md](EXCEL_MAPPING.md) — Excel report column mapping

## Deployment Checklist

1. Push to GitHub (see [DEPLOYMENT.md](DEPLOYMENT.md))
2. Connect repo to Vercel (root: `ioc-invoice-app`)
3. Set environment variables in Vercel
4. Verify Supabase migrations applied (5 migrations via MCP `list_migrations`)
5. Configure Supabase Auth redirect URLs for production domain
6. Add `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` to `.env.local`
7. Smoke test: login → upload → approve → dashboard → Excel export

## Troubleshooting

- **Auth redirect loops:** Ensure `NEXT_PUBLIC_SUPABASE_URL` matches project and redirect URLs are configured in Supabase Dashboard.
- **RLS errors:** Check user is authenticated; verify RLS policies allow SELECT + UPDATE.
- **Extraction failures:** Check `ANTHROPIC_API_KEY`; review server logs; retry from invoice detail page.
