# SMG Transport Agency Production Upgrade Plan

## Detected stack

- Framework: Next.js 15 App Router, React 19, TypeScript.
- Styling: Tailwind CSS with local UI primitives and lucide-react icons.
- Backend currently used by the app: Next.js route handlers plus an in-memory demo data store.
- Firebase already present: Firebase Web SDK, Firebase Admin SDK, Firebase Hosting config, Firestore rules, Firestore indexes, Storage rules.
- Authentication: customer Google sign-in through Firebase Auth; staff/admin login supports Firebase ID token verification when Admin SDK env vars are configured, with demo cookie login for local preview.
- Deployment: Firebase Hosting with framework backend configured in `firebase.json`; static-export support exists through `STATIC_EXPORT=1`.
- Existing scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `seed`, `admin:set-super-admin`.

## Current strengths to preserve

- Mobile-first booking flow, route search, seat selection, payment abstraction, confirmation pages, and customer dashboard.
- Server-side admin route protection for the App Router admin group.
- Existing role/status update flow using Firebase Admin SDK and custom claims.
- Existing idempotent `scripts/set-super-admin.ts` bootstrap for `francis@pwavwe.com`.
- Existing SEO metadata, Open Graph image, icons, 404 page, loading page, error boundary, and security headers.
- Demo mode for local development without external services.

## Implementation plan

1. Extend shared domain types and validation schemas for public site config, chatbot config, chat sessions, FAQs/policies, and audit records.
2. Add server-side admin configuration APIs that validate input, enforce staff roles, write `siteConfig/public`, and append audit logs through Firebase Admin SDK when configured.
3. Add admin pages for `/admin/config` and `/admin/chatbot` using existing dashboard design patterns, including confirmation flows for dangerous changes.
4. Add frontend runtime config helpers that read safe public config from Firestore when configured and fall back to brand defaults in demo mode.
5. Add a floating customer chatbot widget and `/support/chat` page. The browser will call a backend endpoint/function only; it will not call Vertex AI directly.
6. Add Firebase Cloud Functions for sensitive operations: `askChatbot`, `updateSiteConfig`, `updateRemoteConfig`, `getAdminDashboardStats`, and support helpers. Remote Config and Vertex AI model parameters will be server-side configurable.
7. Update Firestore rules for `siteConfig`, `chatSessions`, `faqs`, `policies`, `remoteConfigDrafts`, and stricter role/config access.
8. Update `firebase.json`, package scripts, env template, and documentation for deployment and manual Firebase/Google Cloud setup.
9. Run lint, typecheck, tests where available, and production build. Fix implementation errors and document any remaining external setup that cannot be completed locally.

## Security constraints

- No secrets are committed or exposed to the browser.
- Paystack public key may be client-readable; secret keys remain server-only.
- Vertex AI calls and Remote Config mutations happen from server-side code only.
- Normal customers cannot edit roles, status, site config, chatbot model settings, prices, routes, schedules, or production flags.
- Role and high-risk config changes require protected backend checks and audit logs.

## Known external/manual dependencies

- Firebase project credentials must be supplied via local/server env vars or Google Application Default Credentials.
- Firebase Auth Google provider must be enabled in the Firebase Console.
- App Check enforcement, Remote Config defaults, Vertex AI API enablement, and Secret Manager values require Firebase/Google Cloud Console setup.
- `francis@pwavwe.com` must sign in once before the bootstrap script can promote that Firebase Auth user.
