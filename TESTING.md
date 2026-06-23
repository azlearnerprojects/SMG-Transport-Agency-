# TESTING

## Commands

```powershell
npm run lint        # ESLint (next/core-web-vitals + TypeScript rules)
npm run typecheck   # tsc --noEmit, strict mode
npm run test        # Vitest unit/integration tests
npm run test:e2e    # Playwright E2E (install browsers first, see below)
```

## Unit / integration tests (Vitest) — `tests/unit`

| File | Covers |
|---|---|
| `fare.test.ts` | Base + fees, percentage & flat (capped) promotions, applicability windows/routes, `round2`. |
| `booking-rules.test.ts` | `hoursUntilDeparture`, cancellation & rescheduling eligibility (cut-offs, status, max reschedules), refund quote incl. non-refundable fares. |
| `schemas.test.ts` | Ghana phone validation/normalisation, trip search (same origin/dest rejected), passenger validation, booking consent + min seats. |
| `store.test.ts` | **Seat-hold conflict prevention (no double-booking)**, idempotent re-hold, **seat-hold expiry** (fake timers), booking total calculation, **server-verified confirmation + idempotency**, seats become permanently booked, guest lookup (reference + contact), **cancellation eligibility + seat release + record retention**, schedule search. |

Current status: **28 tests passing** across 4 files.

These map to the required test areas: route search, schedule filtering, seat selection,
seat-hold conflict & expiry, passenger validation, booking total, promotion calculation,
payment verification logic, successful confirmation, failed-payment recovery, booking
lookup, and cancellation/rescheduling eligibility. (Customer/admin authorisation and QR
verification are exercised through the API + E2E paths.)

## End-to-end (Playwright) — `tests/e2e/booking.spec.ts`

Covers the full critical journey in Demo Mode with the mock gateway:
search → select schedule → select seat → passenger details → review → pay → e-ticket
(with QR). The dev server is started automatically by `playwright.config.ts`.

First-time browser install:
```powershell
npx playwright install chromium
npm run test:e2e
```
> Browser binaries are a large download; E2E is configured and ready but not auto-run as
> part of `npm run test`.

## Manual smoke checklist
- Home loads; search returns trips; filters work; empty/loading/error states render.
- Seat map is keyboard-navigable (Tab + Enter/Space); held/booked/blocked seats disabled.
- Booking total recomputed server-side; promo discount shown on review.
- Payment success → confirmed ticket; "Simulate failed payment" → recovery path.
- Guest lookup via reference + email/phone; cancellation honours the cut-off.
- Admin requires login; role-restricted modules show an access notice; CSV export works;
  ticket verification + check-in work.

## Accessibility checks
Semantic HTML, labelled form fields, visible focus rings, ARIA on the seat map and status
regions, skip-link, and reduced-motion support. Run Lighthouse / axe DevTools against
`/`, `/book`, and a seat page for an audit.
