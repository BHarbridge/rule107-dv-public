# Rule 107 DV Calculator — Public Standalone

Public, open-access calculator for AAR Office Manual Rule 107 railcar depreciated value. No login required.

## Stack
- Express + Vite + React + Tailwind + shadcn/ui
- Supabase (PostgreSQL) for reference data & calculation history
- Runs on port 5000 (Express serves both API and built client)

## Environment
Create `.env` in the project root:
```
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<JWT legacy anon key>
```

## Develop
```
npm install
npm run dev
```

## Build & Run Production
```
npm run build
NODE_ENV=production node dist/index.cjs
```

## Features
- Full Rule 107 DV engine (30/30 spreadsheet parity tests pass)
- A&B line-item support with code-specific rates & caps
- Historical reference data: cost factors (annual), salvage rates (quarterly), A&B codes
- PDF export + native mobile share
- Stale-data banner — alerts when the current quarter's AAR data is not yet loaded

## Data Isolation
Calculations are scoped by a `X-Visitor-Id` cookie (no login). Each visitor sees only their own history.
