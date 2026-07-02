# DEPLOYMENT

## Pre-flight

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

All four must pass. Ensure `NEXT_PUBLIC_DEMO_MODE=false` and real credentials are set in
the host's environment (never commit them), and complete **FIREBASE_SETUP.md** +
**PAYMENT_SETUP.md** (a production Firestore adapter is required — see PROJECT_STATUS.md).

## Option A — Vercel (recommended for Next.js)

1. Push the repo to GitHub/GitLab.
2. Import the project in Vercel; framework auto-detected as Next.js.
3. Add all environment variables from `.env.example` (with real values).
4. Set the production domain and update `NEXT_PUBLIC_APP_URL`.
5. Deploy. Configure the Paystack webhook to `https://<domain>/api/payments/webhook`.

## Option B — Any Node host / container

```powershell
npm ci
npm run build
npm run start   # serves on PORT (default 3000)
```
Put it behind a TLS-terminating reverse proxy (Nginx/Caddy) and supply env vars via the
platform's secret manager.

## Option C — Firebase Hosting + Cloud Functions

Configured Firebase project ID:

```text
smg-transport-agency
```

This repo uses Firebase web frameworks Hosting (`firebase.json` has `hosting.source`
set to `.`) and Cloud Functions source `functions`.

Before deployment, install or update the Firebase CLI:

```powershell
npm install -g firebase-tools@latest
firebase --version
```

Authenticate and select the project:

```powershell
firebase login
firebase projects:list
firebase use smg-transport-agency
```

Run pre-flight checks:

```powershell
npm run functions:build
npm run typecheck
npm run lint
npm test
npm run build
```

Deploy in smaller chunks:

```powershell
npm run deploy:rules
npm run deploy:functions
npm run deploy:hosting
```

`npm run deploy:all` runs the same chunks in order: Firestore rules/indexes and
Storage rules, then Functions, then Hosting. If the full deploy times out or the
shell reports `EPIPE`, rerun each target separately. Do not mark deployment
complete unless Firebase CLI prints a success message for the target.

After Francis has signed in once and Admin credentials are configured:

```powershell
npm run admin:set-super-admin
```

## Post-deploy checklist
- [ ] HTTPS active (SSL) — required for secure payments and PCI-aligned handling.
- [ ] Security headers present (set in `next.config.mjs`).
- [ ] Firestore + Storage rules deployed; indexes built.
- [ ] Payment webhook reachable and signature secret configured.
- [ ] SMTP + SMS provider credentials set (or accept logged-only notifications).
- [ ] `robots`/`sitemap` reflect the production domain (`NEXT_PUBLIC_APP_URL`).
- [ ] Placeholder content replaced (**CONTENT_REPLACEMENT_CHECKLIST.md**).
- [ ] Seat-hold cleanup scheduled (Cloud Function / cron) for production.
- [ ] Automated daily backups of Firestore configured.
