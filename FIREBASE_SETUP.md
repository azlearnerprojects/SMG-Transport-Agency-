# FIREBASE SETUP

Demo Mode requires **no** Firebase. Follow this when moving to real Firebase services.

## 1. Create a Firebase project
- Firebase console → **Add project**. Enable **Authentication** (Email/Password; optionally
  Phone), **Cloud Firestore**, and **Cloud Storage**.

## 2. Web app config (client, public identifiers)
Project settings → General → Your apps → Web app. Copy into `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## 3. Admin SDK (server, secret)
Project settings → **Service accounts → Generate new private key**. Add to `.env.local`:
```
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```
Keep the literal `\n` escapes on one line; `src/lib/firebase/admin.ts` restores newlines.

## 4. Turn off Demo Mode
```
NEXT_PUBLIC_DEMO_MODE=false
```

## 5. Deploy security rules & indexes
```powershell
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes,storage
```
Rules: `firestore.rules`, `storage.rules`. Indexes: `firestore.indexes.json`.

## 6. Staff roles (custom claims)
Roles are carried in the Firebase Auth **custom claim** `role` (see `firestore.rules`).
Set them with the Admin SDK, e.g.:
```js
await admin.auth().setCustomUserClaims(uid, { role: 'admin', admin: true });
```
Primary auth roles: `super_admin`, `admin`, `staff`, `customer`, `staff_pending`.
Legacy demo operational roles are still supported by the mock admin modules:
`operations_manager`, `booking_officer`, `customer_support`, `finance_officer`,
`content_editor`, `ticket_inspector`.

To bootstrap the first super admin after the user signs in once with Google:
```powershell
npm run admin:set-super-admin
```

## 7. Emulators (local Firebase)
`firebase.json` configures Auth (9099), Firestore (8080), Storage (9199), UI (4000).
```powershell
firebase emulators:start
```

## Production data path

The `getDb()` abstraction (`src/lib/db/index.ts`) uses the in-memory store only
when `NEXT_PUBLIC_DEMO_MODE=true`. In non-demo mode it uses the Firestore adapter
in `src/lib/db/firestore-store.ts`, including transactional seat holds, booking
creation, payment confirmation, reports, and admin reads.

Before go-live, run:

```powershell
npm run production:check
```

This verifies the local production blockers that can be checked without calling
the Firebase Console: Firebase client/Admin config, project id alignment,
canonical domain allow-list, live Paystack mode, strong signing secrets, and
admin-facing launch switches when viewed from `/admin/config`.

Remaining operational work:

1. Move seat-hold cleanup to a scheduled Cloud Function (the demo cleans up lazily).
2. Persist email/SMS sending to production providers as required by the launch plan.
3. Confirm Firestore backups, App Check enforcement, IAM, and Auth provider settings
   in Firebase Console.

The client/admin initialisers (`src/lib/firebase/client.ts`, `admin.ts`) already
lazy-load the SDKs and no-op safely when credentials are missing. See `ADMIN_SETUP.md`
for the current Google sign-in, user profile, and role-management workflow.
