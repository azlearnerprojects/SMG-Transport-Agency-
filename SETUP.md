# SETUP

Step-by-step local setup for the SMG Transport Agency platform (PowerShell-friendly).

## 1. Prerequisites

- Node.js LTS (built on Node 24; 18.18+ supported) and npm.
- Verify: `node --version` and `npm --version`.

## 2. Install dependencies

```powershell
cd "$HOME\Desktop\SMG-Transport-Agency"
npm install
```

## 3. Environment

A `.env.local` configured for **Demo Mode** is already present. To recreate it:

```powershell
Copy-Item .env.example .env.local
```

Demo Mode defaults (no external services required):

```
NEXT_PUBLIC_DEMO_MODE=true
PAYMENT_PROVIDER=mock
NEXT_PUBLIC_APP_URL=http://localhost:3000
SEAT_HOLD_TTL_SECONDS=600
DEMO_ADMIN_EMAIL=admin@smgtransport.test
DEMO_ADMIN_PASSWORD=Demo!Admin2026
```

## 4. Seed / inspect demo data (optional)

```powershell
npm run seed
```

This validates referential integrity, prints a summary and writes
`data/seed.generated.json`. In Demo Mode the running app seeds itself in memory, so
this step is purely for inspection.

## 5. Run the app

```powershell
npm run dev
```

Open http://localhost:3000.

- Customer demo: `ama@example.com` (any password).
- Admin demo: `admin@smgtransport.test` / `Demo!Admin2026` at `/admin/login`.

## 6. Quality gates

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

## 7. End-to-end tests (optional)

```powershell
npx playwright install chromium
npm run test:e2e
```

## Troubleshooting

- **Port 3000 in use:** `next dev -p 3001` or stop the other process.
- **Fonts fail at build time:** `next/font` fetches Montserrat/Open Sans at build; ensure
  network access, or the app falls back to the system font stack defined in Tailwind.
- **"Non-demo mode requires a Firestore adapter":** you set `NEXT_PUBLIC_DEMO_MODE=false`
  without wiring Firebase. Set it back to `true` for local demos, or follow
  **FIREBASE_SETUP.md**.
- **Multiple lockfiles warning:** harmless; `outputFileTracingRoot` is pinned to the project
  in `next.config.mjs`.
