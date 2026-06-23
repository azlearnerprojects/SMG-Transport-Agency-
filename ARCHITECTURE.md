# ARCHITECTURE

## Overview

The platform is a Next.js 15 App Router application written in TypeScript (strict).
Business logic is kept in pure, testable modules under `src/lib`, while React
components stay thin and presentational. Server route handlers form the secure API
boundary; the browser is never trusted for money or availability decisions.

```
Browser (RSC + Client Components)
        │  fetch()
        ▼
Next.js Route Handlers (/src/app/api/*)   ← validation (Zod), rate limiting, auth
        │  getDb()
        ▼
Data layer abstraction (src/lib/db)
        ├─ DEMO: in-memory MockStore (src/lib/data/store.ts)
        └─ PROD: Firestore adapter (to implement — same surface as MockStore)
Payments abstraction (src/lib/payments)
        ├─ MockPaymentProvider (simulated gateway)
        └─ PaystackProvider (test/live REST + signed webhooks)
Notifications: email (Nodemailer) + SMS (pluggable provider)
```

## Key design decisions

### Data-layer abstraction (`getDb()`)
All data access goes through `getDb()` (`src/lib/db/index.ts`). In Demo Mode it returns
a singleton in-memory `MockStore`; otherwise it is the seam where a Firestore-backed
adapter (implementing the same method surface) is wired in. We **throw loudly** in
non-demo mode rather than silently serving mock data, so integrations are never faked.

### Why an in-memory store for the MVP
It makes the entire product — booking, seat holds, dashboards, admin, reports —
demonstrable with zero external setup. Node is single-threaded, so each synchronous
mutation method (hold, confirm) is effectively a critical section that re-checks
availability before committing: the same guarantee a Firestore transaction provides in
production. State is attached to `globalThis` to survive Next.js HMR. **Limitation:**
state is per-process and resets on restart (acceptable for a demo; see PROJECT_STATUS).

### Seat holds & double-booking prevention
`holdSeats()` re-checks booked + maintenance-blocked + other sessions' active holds,
then commits a hold with an `expiresAt`. Bookings reference a `holdId`; `createBooking`
is idempotent per hold. `confirmPayment` re-checks availability, converts the hold into
permanent `bookedSeatIds`, and is idempotent (safe under redirect + webhook double
delivery). Expired holds are cleaned up lazily on access.

### Payments
The booking flow depends only on the `PaymentProvider` interface
(`initialize` / `verify` / `verifyWebhookSignature`). Adding a Ghanaian provider
(Hubtel, Flutterwave…) is a new class + an env var — no booking changes. Confirmation
happens **only** after server-side verification (and/or signed webhook); the browser's
"success" is never trusted. Amounts are validated against the booking total.

### Pure business logic
`src/lib/fare.ts` (fare + promotions) and `src/lib/booking-rules.ts` (cancellation /
rescheduling eligibility, refund quotes) are pure functions with injected `now` — fully
unit-tested and free of I/O.

### Auth
- **Customers (demo):** a localStorage-backed React context (`customer-auth.tsx`) — the
  seam where Firebase Authentication (email/password, verification, reset, phone) plugs in.
- **Staff (demo):** a signed (HMAC) httpOnly session cookie carrying email + role. The
  admin layout verifies it **server-side**; protection never relies on hidden links. In
  production this is replaced by Firebase Auth ID tokens + custom-claim roles.

### Rendering strategy
Public, data-driven pages are React Server Components reading `getDb()` directly. Highly
interactive surfaces (seat map, search card, payment, dashboard, admin tables with
export) are Client Components. The public site chrome is gated off the `/admin` area via
`ChromeGate` so the dashboard has its own shell.

## Directory map (selected)

- `src/lib/config.ts` — typed env access, brand + policy defaults.
- `src/lib/types.ts` — domain model (mirrors Firestore collections).
- `src/lib/schemas.ts` — Zod schemas shared by client forms and server APIs.
- `src/lib/data/seed.ts` — demo dataset builder (relative to "now").
- `src/lib/data/store.ts` — in-memory store: availability, holds, bookings, payments,
  cancellation/reschedule, reports, audit.
- `src/lib/payments/*` — provider interface, mock, Paystack, resolver.
- `src/lib/qr.ts` + `verify-token.ts` — QR points at a signed verify URL (no PII in QR).
- `src/app/api/*` — holds, bookings, payments (init/verify/fail/webhook), lookup,
  cancel/reschedule, resend, contact, customer bookings, admin (login/logout/verify/
  checkin/settings).

## Error handling & logging
`withErrorHandling` wraps route handlers: Zod errors → 422 with field messages; unknown
errors → safe 500 (never a stack/secret). `src/lib/logger.ts` is a central structured
logger. UI uses `error.tsx`, `not-found.tsx`, loading skeletons and explicit empty/error
states.
