# PROJECT STATUS

_Last updated: 2026-06-23. Reflects the MVP delivered in Demo Mode._

## Quality gates (all passing)
- `npm run lint` → ✅ no warnings or errors
- `npm run typecheck` → ✅ clean (strict)
- `npm run test` → ✅ 28 tests passing (4 files)
- `npm run build` → ✅ production build succeeds (60+ routes)
- Manual + API verification → ✅ full booking flow, admin auth, guest lookup confirmed

## ✅ Completed features
- Full public website: home, book, routes & schedules, fleet, promotions, FAQ, about,
  travel/cancellation policies, terms, privacy, contact, manage booking, login, register,
  customer dashboard, booking confirmation, e-ticket, payment status, QR verify, 404 + error.
- 3-step booking flow with progress indicator and back-navigation that preserves input.
- Interactive, keyboard-accessible seat map (classes, availability, blocked, held).
- Atomic seat holds with expiry; double-booking prevention; idempotent booking creation.
- Server-side payment verification, idempotent confirmation, signed webhook handler;
  mock gateway + Paystack test adapter behind a provider abstraction.
- QR e-tickets (view/print/re-email) with token-secured verification.
- Customer dashboard (upcoming/pending/past/cancelled), profile editing; guest lookup.
- Cancellation (with refund quote) and rescheduling flows with configurable policy.
- Role-based admin dashboard with all 19 modules (overview, bookings, payments, buses,
  routes, schedules, seat layouts, fare categories, customers, staff, promotions, content,
  announcements, FAQs, reports + CSV, ticket verification + check-in, settings, audit,
  support inbox). Server-side route protection + per-module role gates.
- Reports with CSV export; admin-editable System Settings (policy values).
- Contact form with validation, honeypot and rate limiting; support inbox.
- Design system (navy/gold brand, Montserrat/Open Sans), mobile-first, accessibility
  features, SEO (metadata, OG/Twitter, sitemap, robots, JSON-LD), security headers.
- Demo data seed, unit + E2E tests, Firestore/Storage rules, indexes, emulator config.
- Full documentation set.

## 🟡 Partially completed / simplified for the MVP
- **Admin CRUD**: management modules read live data and export; create/edit/archive UIs
  are scaffolded conceptually but not all wired to write forms (data-layer methods exist).
- **CMS**: content is listed and safely rendered (escaped); a rich-text editing UI is not
  yet built.
- **Rescheduling**: supported via Manage Booking (pick a new date → choose a trip, keeping
  seats); seat re-selection on the new trip is automatic, not a full seat-map re-pick.
- **SMS**: provider abstraction in place; concrete provider call not implemented (logs).
- **Account deletion / password reset / email verification**: UX present; backed by
  Firebase Auth in production (no-op/placeholder in demo).

## 🔌 Features awaiting credentials
- Real Firebase (Auth/Firestore/Storage) — see **FIREBASE_SETUP.md**.
- Live Paystack keys + webhook secret — see **PAYMENT_SETUP.md**.
- SMTP email + SMS provider credentials.
- Production domain (`NEXT_PUBLIC_APP_URL`).

## 📝 Features awaiting business content
See **CONTENT_REPLACEMENT_CHECKLIST.md** — logo, photos, official routes/schedules/fares,
final policy text + values, contact details, social links.

## ⚠️ Known limitations
- Demo data layer is **in-memory & single-process**: state resets on server restart and is
  not shared across instances. A production **Firestore adapter** must implement the same
  `MockStore` surface and be wired into `getDb()`.
- Demo auth (customer localStorage; staff HMAC cookie + shared demo password) must be
  replaced by Firebase Auth + custom-claim roles.
- Rate limiting is in-memory (per instance) — use a shared store in production.
- Seat-hold cleanup is lazy (on access) in demo — schedule a Cloud Function in production.
- Playwright E2E is configured but requires `npx playwright install chromium` to run.

## 🧭 Recommended next development steps
1. Implement the Firestore `getDb()` adapter (transactions for holds/confirmation) + swap
   auth to Firebase Auth with custom-claim roles.
2. Build admin write-forms (bus/route/schedule/promotion/FAQ/content CRUD) on the existing
   data methods + confirmation dialogs for destructive actions.
3. Add a rich-text CMS editor with server-side sanitisation.
4. Wire a concrete SMS provider (e.g. Arkesel/Hubtel) and verify email deliverability.
5. Move seat-hold cleanup to a scheduled function; add Firestore backups + monitoring.
6. Replace all placeholder content/credentials; run Lighthouse/axe + a security review.
7. Install Playwright browsers in CI and gate merges on lint/typecheck/test/build/E2E.
