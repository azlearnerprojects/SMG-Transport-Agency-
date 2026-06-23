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
await admin.auth().setCustomUserClaims(uid, { role: 'operations_manager' });
```
Supported roles: `super_admin`, `operations_manager`, `booking_officer`, `customer_support`,
`finance_officer`, `content_editor`, `ticket_inspector`.

## 7. Emulators (local Firebase)
`firebase.json` configures Auth (9099), Firestore (8080), Storage (9199), UI (4000).
```powershell
firebase emulators:start
```

## Remaining integration work (this MVP)

The `getDb()` abstraction (`src/lib/db/index.ts`) currently provides the in-memory store
for Demo Mode and **throws** in non-demo mode. To go live you must:

1. Implement a **Firestore adapter** exposing the same method surface as `MockStore`
   (queries, atomic seat holds via `runTransaction`, booking/payment lifecycle, reports).
2. Wire it into `getDb()` for the non-demo branch.
3. Replace the demo auth seams: customer auth (`src/lib/auth/customer-auth.tsx`) with
   Firebase Auth, and staff sessions (`src/lib/auth/session.ts`) with ID-token + claim
   verification via the Admin SDK.
4. Move seat-hold cleanup to a scheduled Cloud Function (the demo cleans up lazily).
5. Persist email/SMS sending and the audit log to Firestore.

The client/admin initialisers (`src/lib/firebase/client.ts`, `admin.ts`) already
lazy-load the SDKs and no-op safely in Demo Mode.
