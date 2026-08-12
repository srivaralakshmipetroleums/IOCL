# IOC Invoice Automation

Monorepo root for the IOC Invoice Management & Reporting System.

## Structure

```
├── Docs/                  # Product requirements (B-PRD, T-PRD)
├── ioc-invoice-app/       # Next.js application
├── README.md              # Project overview
├── ARCHITECTURE.md        # System design
├── DATABASE.md            # Schema documentation
├── EXTRACTION.md          # AI extraction pipeline
└── EXCEL_MAPPING.md       # Excel report mapping
```

## Quick Start

```bash
cd ioc-invoice-app
npm install
cp .env.example .env.local
# Add SUPABASE_SERVICE_ROLE_KEY and ANTHROPIC_API_KEY to .env.local
npm run dev
```

See [ioc-invoice-app/README](ioc-invoice-app/README.md) for full setup instructions.
