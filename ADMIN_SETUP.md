# SMG Admin Setup

This guide covers the Google sign-in, profile sync, role management, and first
super-admin bootstrap for SMG Transport Agency.

## What Was Added

- Firebase Google sign-in for customers and staff.
- Automatic Firestore profile creation in `users/{uid}` after Google sign-in.
- A protected `/profile` screen for signed-in users.
- A Firebase-token admin login path that creates the existing secure HTTP-only admin session.
- A protected `/admin/users` Users & Roles screen.
- Firestore rules that prevent users from editing their own `role` or `status`.
- An idempotent script to promote `francis@pwavwe.com` to `super_admin`.

## Required Environment Variables

Client Firebase values are public identifiers:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

Server Admin SDK values are secrets:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
ADMIN_SESSION_SECRET=
```

The super-admin bootstrap script has one fixed production target:
`francis@pwavwe.com`.

Keep real secrets in `.env.local`, Firebase Functions environment/secrets, or the
hosting provider secret manager. Do not commit them.

## Firebase Admin Credentials

The Admin SDK is required for the super-admin bootstrap, server-side ID-token
verification, role claims, privileged Firestore writes, Remote Config publishing,
and Cloud Functions admin work.

Use one of these supported local credential paths.

If `gcloud` is not installed on this machine, skip Option A and use Option B.
The bootstrap script does not require `gcloud` specifically; it only needs valid
Admin SDK credentials.

### Option A - Google Application Default Credentials

1. Install or verify the Google Cloud CLI:

```powershell
gcloud --version
```

2. Sign in for Application Default Credentials:

```powershell
gcloud auth application-default login
```

3. Set the Firebase/Google Cloud project:

```powershell
gcloud config set project smg-transport-agency
```

4. Verify ADC can mint a token:

```powershell
gcloud auth application-default print-access-token
```

5. Keep the local project env aligned:

```powershell
$env:FIREBASE_PROJECT_ID="smg-transport-agency"
```

### Option B - Service Account JSON

1. In Firebase Console or Google Cloud Console, create/download a Firebase Admin
   service account key for project `smg-transport-agency`.
2. Store the JSON outside this repo, for example under a private local secrets
   folder.
3. Point the shell at it before running admin scripts:

Windows PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
$env:FIREBASE_PROJECT_ID="smg-transport-agency"
```

macOS/Linux:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
export FIREBASE_PROJECT_ID="smg-transport-agency"
```

Never commit the JSON file. `.gitignore` excludes common env files, but it cannot
protect secrets stored under a new filename.

## Required Firebase/Google Services

Enable these before production deploy:

- Firebase Authentication.
- Google sign-in provider.
- Cloud Firestore.
- Firebase Hosting.
- Cloud Functions for Firebase.
- Firebase Remote Config.
- Firebase App Check.
- Vertex AI API.
- Billing on the Firebase/Google Cloud project if Cloud Functions or Vertex AI
  require it.

The deploying account or service account needs enough IAM for:

- Firebase Hosting Admin or Firebase Admin for hosting deploys.
- Cloud Datastore/Firestore permissions for rules and index deploys.
- Cloud Functions Admin plus service account act-as permissions for functions.
- Remote Config Admin for publishing config from admin tools.
- Vertex AI User for the Cloud Functions runtime service account.

## Google Sign-In And Profile Creation

The customer auth provider uses Firebase Auth when Firebase client env vars are
present. After a Google sign-in, it creates or updates:

```text
users/{uid}
```

Profile fields:

- `uid`
- `displayName`
- `email`
- `photoURL`
- `phone`
- `role`
- `status`
- `createdAt`
- `updatedAt`
- `lastLoginAt`

New Google users default to:

```json
{ "role": "customer", "status": "active" }
```

Profile updates only touch display/contact fields and login timestamps.

## Roles

Primary auth roles:

- `super_admin`: full access, including role/status changes.
- `admin`: can access operational admin screens and read users.
- `staff`: reserved for limited staff access.
- `support_agent`: can access support/chatbot conversation tooling without model-setting privileges.
- `customer`: no admin access.
- `staff_pending`: no admin access until approved.

Legacy demo operational roles still exist for the current mock admin modules:

- `operations_manager`
- `booking_officer`
- `customer_support`
- `finance_officer`
- `content_editor`
- `ticket_inspector`

Firebase custom claims should include `role`. Super admins also get:

```json
{ "superAdmin": true, "admin": true }
```

## Promote Francis To Super Admin

1. Confirm Google provider is enabled in Firebase Authentication.
2. Ask Francis to sign in once with `francis@pwavwe.com`.
3. Configure Admin SDK credentials using Option A or Option B above.
4. Run:

```powershell
npm run admin:set-super-admin
```

The script:

- Finds the Auth user by email.
- Sets custom claims: `{ role: "super_admin", superAdmin: true, admin: true }`.
- Creates or updates the Firestore profile with `role: "super_admin"` and `status: "active"`.
- Is safe to run multiple times.

If the Auth user does not exist yet, the script exits with a clear message and can
be rerun after the first Google sign-in.

Troubleshooting:

- If the script says the user was not found, sign in once with Google using
  `francis@pwavwe.com`, then rerun:

```powershell
npm run admin:set-super-admin
```

- If the script says credentials are missing or invalid, run the ADC verification
  command or re-check `GOOGLE_APPLICATION_CREDENTIALS`.

## Users & Roles

Open:

```text
/admin/users
```

Admins can search, filter, and inspect profiles. Only `super_admin` can change
roles or activate/deactivate users. Each role/status change writes:

```text
auditLogs/{logId}
```

Audit fields:

- `action`
- `performedByUid`
- `performedByEmail`
- `targetUid`
- `targetEmail`
- `previousValue`
- `newValue`
- `createdAt`

## Firestore Collections

Implemented for this task:

- `users/{uid}`
- `auditLogs/{logId}`

Existing typed collections and placeholder/admin pages cover:

- `bookings/{bookingId}`
- `routes/{routeId}`
- `buses/{busId}`
- `schedules/{scheduleId}`
- `payments/{paymentId}`
- `announcements/{announcementId}`
- `siteConfig/public`
- `siteConfig/private`
- `remoteConfigDrafts/{draftId}`
- `faqs/{faqId}`
- `policies/{policyId}`
- `chatSessions/{sessionId}`
- `chatSessions/{sessionId}/messages/{messageId}`

See `DATABASE_SCHEMA.md` and `src/lib/types.ts` for the full domain model.

## Admin Config And Chatbot

- `/admin/config` manages safe public runtime settings and can publish matching Remote Config keys.
- `/admin/chatbot` manages support chat status, welcome text, escalation, FAQ/policy entries, conversation review, and AI runtime settings.
- Only `super_admin` can update chatbot model name, system prompt version, temperature, and output-token limits.
- `support_agent` can view and resolve chat sessions but cannot update model settings.

## Security Notes

- Admin privileges are not granted in frontend-only logic.
- `/admin/login` verifies Firebase ID tokens with the Admin SDK before setting the admin session cookie.
- Firestore rules prevent users from changing their own `role` or `status`.
- Role/status writes go through privileged server APIs or Admin SDK scripts.
- Normal users cannot update or delete audit logs.
- Do not expose service account credentials in client env vars.

## Deployment

Run local checks:

```powershell
npm run functions:build
npm run typecheck
npm run lint
npm test
npm run build
```

Deploy in smaller chunks. This is more resilient than a single full Firebase
deploy if the CLI or shell output stream times out.

```powershell
npm run deploy:rules
npm run deploy:functions
npm run deploy:hosting
```

`npm run deploy:all` runs those chunks in this order:

1. Firestore rules/indexes and Storage rules.
2. Cloud Functions.
3. Hosting.

If `deploy:all` times out or fails, rerun each target separately. Do not assume a
deployment succeeded unless the Firebase CLI prints a success message for that
target.

After credentials are configured and Francis has signed in once, promote the
super admin:

```powershell
npm run admin:set-super-admin
```

If the promoted admin state changes public/admin UI behavior, redeploy hosting:

```powershell
npm run deploy:hosting
```
