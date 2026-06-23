# Changelog

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); the project uses 0.x versioning while
pre-launch.

## [0.1.0] — 2026-06-23

Initial MVP of the SMG Transport Agency digital booking platform.

### Added
- Next.js 15 (App Router) + TypeScript (strict) + Tailwind project scaffold with the
  SMG brand design system (Deep Navy `#003366`, Gold `#FFC107`, Montserrat/Open Sans).
- Data-layer abstraction (`getDb()`) with an in-memory mock store for **Demo Mode** and a
  documented seam for a production Firestore adapter.
- Domain model (`types.ts`) + shared Zod schemas; pure, tested fare and booking-rules logic.
- Public website: home, book, routes & schedules, fleet, promotions, FAQ, about,
  travel/cancellation policies, terms, privacy, contact, manage booking, login, register,
  dashboard, booking confirmation, e-ticket, payment status, QR verify, 404 + error pages.
- 3-step booking flow: trip search → interactive accessible seat map + passenger details →
  review & payment, with progress indicator and preserved input on back-navigation.
- Atomic seat holds with expiry, double-booking prevention, idempotent booking creation.
- Payment provider abstraction: mock simulated gateway + Paystack test adapter; server-side
  verification, idempotent confirmation, signature-validated webhook.
- QR e-tickets (view / print / re-email) and token-secured verification page.
- Customer accounts (demo) + guest checkout and lookup; cancellation & rescheduling.
- Role-based admin dashboard (19 modules) with server-side protection, reports + CSV export,
  ticket verification + check-in, editable system settings, audit logs, support inbox.
- Email (Nodemailer) + pluggable SMS abstraction; central logger; rate limiting; honeypot.
- SEO (metadata, OpenGraph/Twitter, sitemap, robots, JSON-LD) and security headers.
- Firestore & Storage security rules, composite indexes, Firebase emulator config.
- Demo seed script; Vitest unit/integration tests (28 passing) + Playwright E2E spec.
- Documentation: README, SETUP, ARCHITECTURE, DATABASE_SCHEMA, PAYMENT_SETUP,
  FIREBASE_SETUP, DEPLOYMENT, TESTING, SECURITY_NOTES, CONTENT_REPLACEMENT_CHECKLIST,
  PROJECT_STATUS, CHANGELOG.

### Notes
- All routes/schedules/fares/customers are **sample data**, not official SMG offerings.
- Demo auth, in-memory store and mock payments are for local demonstration; see
  PROJECT_STATUS.md and SECURITY_NOTES.md for the production path.
