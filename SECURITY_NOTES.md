# SECURITY NOTES

## Principles applied

- **Server-authoritative money & availability.** Fares, totals, seat availability and
  payment success are decided on the server (`src/app/api/*`, `src/lib/data/store.ts`).
  Browser-supplied values are re-validated/recomputed; never trusted.
- **Payment verification.** Bookings confirm only after server-side `provider.verify()`
  and amount checks, and/or a **signature-validated webhook**. Confirmation is idempotent
  (`confirmPayment`), preventing duplicate processing under redirect + webhook delivery.
- **No secrets in the browser.** Secret keys (Paystack, SMTP, Admin SDK, session/QR
  secrets) are server-only env vars. `.env.local` is git-ignored; `.env.example` holds no
  real values.
- **No card data stored.** Only provider transaction references are retained.
- **Input validation everywhere.** Zod schemas validate every API boundary
  (`src/lib/schemas.ts`); `withErrorHandling` returns safe messages — never stack traces.
- **Admin protection is server-side.** The admin layout verifies a signed httpOnly session
  cookie server-side and per-module role checks gate sensitive modules. Protection never
  relies on hidden navigation links. Admin mutations (check-in, settings) re-check roles.
- **Guest booking lookup** goes through a rate-limited endpoint and requires reference +
  matching contact; responses are deliberately vague to deter enumeration.
- **Abuse prevention.** In-memory fixed-window rate limiting on lookup, contact,
  cancellation, resend, admin login and customer-bookings endpoints. The contact form adds
  a honeypot field.
- **QR codes carry no PII.** A ticket QR encodes only a signed verification URL
  (`/verify?ref=…&t=<hmac>`); the token is validated server-side (`src/lib/verify-token.ts`).
- **CMS content is escaped.** User/editor content is rendered through an HTML-escaping
  sanitiser (`src/lib/sanitize.ts`) — script injection is impossible by construction.
- **Security headers** (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`) set in `next.config.mjs`.
- **Firestore/Storage rules** (`firestore.rules`, `storage.rules`): public read of
  non-sensitive operational data only; customers read only their own data; payments/holds
  are server-only; audit logs append-only; uploads validated by type/size; default deny.

## Demo-mode caveats (must change before production)

- Demo customer auth is **client-side localStorage** — replace with Firebase Auth.
- Demo staff auth uses an **HMAC cookie + a shared demo password** from env — replace with
  Firebase Auth ID tokens + custom-claim roles verified by the Admin SDK.
- `/api/customer/bookings` trusts an email in the request body (demo only) — in production
  read the authenticated user's verified token instead.
- The mock store is in-memory/single-process; rate limiting is in-memory. Use Firestore +
  a shared store (e.g. Redis) for multi-instance production.

## Recommended hardening for launch
- Enforce HTTPS/HSTS; add a Content-Security-Policy.
- Set rotated, strong `ADMIN_SESSION_SECRET` and `QR_VERIFY_SECRET`.
- Add server-side logging/alerting and Firestore daily backups.
- Penetration-test the payment and booking flows before go-live.
