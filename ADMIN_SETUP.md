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
SUPER_ADMIN_EMAIL=francis@pwavwe.com
```

Keep real secrets in `.env.local` or the hosting provider secret manager. Do not
commit them.

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
3. Make sure Admin SDK env vars are present.
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

See `DATABASE_SCHEMA.md` and `src/lib/types.ts` for the full domain model.

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
npm run lint
npm run typecheck
npm run build
```

Deploy Firebase rules and the Next app through the existing Firebase Hosting setup:

```powershell
firebase deploy --only hosting,firestore:rules,firestore:indexes,storage
```

If Cloud Functions are added later, deploy them with:

```powershell
firebase deploy --only hosting,firestore:rules,firestore:indexes,functions
```
