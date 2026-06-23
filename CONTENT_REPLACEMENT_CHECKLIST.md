# CONTENT REPLACEMENT CHECKLIST

Everything below is a **placeholder** for development and must be reviewed/replaced with
CEO-approved content and real assets before launch. Items are grouped by type with file
locations to make replacement easy.

## Branding & media
- [ ] **Placeholder logo / monogram** → real SMG logo — `src/components/layout/logo.tsx`
- [ ] **Fleet photographs** (currently icon placeholders) — `src/app/fleet/page.tsx`
- [ ] **CEO photograph** (Gabriel Atuobi) — `src/app/about/page.tsx`
- [ ] **Team photographs** — (add when available)
- [ ] **Favicon / OG share image** — `src/app/` metadata + `/public`

## Business information (placeholders in `src/lib/config.ts` → `BRAND`)
- [ ] Business phone number (`supportPhone`)
- [ ] WhatsApp number (`whatsapp`)
- [ ] Business email (`email`)
- [ ] Office / terminal address(es) (`office`, and `boardingPoints` in seed)
- [ ] Social media links (`social.facebook/instagram/twitter/tiktok`)
- [ ] Support hours — `src/app/contact/page.tsx`

## Operational data (currently SAMPLE data — `src/lib/data/seed.ts`)
- [ ] **Official routes** (origins, destinations, boarding points)
- [ ] **Approved schedules** (departure/arrival times, frequency)
- [ ] **Approved fare prices** per class + service fees
- [ ] Bus numbers, names, capacities, amenities, seat layouts
- [ ] Promotions (codes, values, validity)

## Policies & legal (placeholder copy — review with CEO/legal)
- [ ] Travel policies — `src/app/policies/travel/page.tsx`
- [ ] Cancellation & refund policy + **policy values** — `src/app/policies/cancellation/page.tsx` and admin **System Settings** (`DEFAULT_POLICY` in `src/lib/config.ts`)
- [ ] Terms & conditions — `src/app/terms/page.tsx`
- [ ] Privacy policy — `src/app/privacy/page.tsx`
- [ ] FAQs — admin CMS / `src/lib/data/seed.ts`
- [ ] Testimonials (placeholder, needs consented real reviews) — `src/app/page.tsx`
- [ ] About: company story, mission, vision, values, CEO quote — `src/app/about/page.tsx`

## Credentials & integrations (set in environment, never in code)
- [ ] Firebase web + Admin SDK keys (**FIREBASE_SETUP.md**)
- [ ] Final payment credentials — Paystack live keys + webhook secret (**PAYMENT_SETUP.md**)
- [ ] SMTP email credentials
- [ ] SMS provider + API key + sender ID
- [ ] **Final domain name** → set `NEXT_PUBLIC_APP_URL` (affects canonical URLs, sitemap,
      QR verification links, OG tags)

## Configurable policy values pending approval (admin → System Settings)
- [ ] Cancellation cut-off hours
- [ ] Rescheduling cut-off hours
- [ ] Cancellation fee %
- [ ] Maximum reschedules per booking
- [ ] Refund processing days
- [ ] Non-refundable fare categories
- [ ] Seat-hold lifetime
