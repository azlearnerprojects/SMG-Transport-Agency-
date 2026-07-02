# SMG Transport Agency Production Readiness Report

## Firebase Project Configuration

- `.firebaserc` default project: `smg-transport-agency`.
- `firebase.json` Hosting: Firebase web frameworks Hosting with `hosting.source` set to `.`.
- Hosting target/site: no explicit `target` or `site` is configured, so deploy uses the default Hosting site for `smg-transport-agency`.
- Firestore rules: `firestore.rules`.
- Firestore indexes: `firestore.indexes.json`.
- Storage rules: `storage.rules`.
- Functions source: `functions`.
- Functions runtime: Node.js 20.
- Functions region defaults: `us-central1`.
- App Firebase config: loaded from `NEXT_PUBLIC_FIREBASE_*` env vars; set `NEXT_PUBLIC_FIREBASE_PROJECT_ID=smg-transport-agency` for production.
- Admin Firebase config: loaded from inline Admin SDK env vars or Google Application Default Credentials; set `FIREBASE_PROJECT_ID=smg-transport-agency` for local admin commands.

## Deployment Resilience

The previous one-shot deploy failed with `EPIPE`, so deploys are now split into smaller targets:

- `npm run deploy:rules`
- `npm run deploy:functions`
- `npm run deploy:hosting`
- `npm run deploy:all`

`deploy:all` runs in this order:

1. Firestore rules/indexes and Storage rules.
2. Cloud Functions.
3. Hosting.

If `deploy:all` times out, deploy each target separately. Do not assume a target deployed unless Firebase CLI prints a success message for that target.

Firebase CLI check:

- Installed locally: `15.19.1`.
- Latest from npm: `15.22.4`.
- Update before deploying:

```powershell
npm install -g firebase-tools@latest
firebase --version
```

## Credentials Status

Usable Firebase Admin credentials were not verified in this shell. The process
environment does not contain Admin SDK / ADC credential variables, and the
previous super-admin attempt failed because Firebase Admin SDK / Application
Default Credentials were unavailable. `.env.local` was not inspected for secret
values.

Supported local credential options are documented in `ADMIN_SETUP.md` and `CHATBOT_SETUP.md`.

Option A - Google Application Default Credentials:

```powershell
gcloud --version
gcloud auth application-default login
gcloud config set project smg-transport-agency
gcloud auth application-default print-access-token
$env:FIREBASE_PROJECT_ID="smg-transport-agency"
```

Option B - Service account JSON:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
$env:FIREBASE_PROJECT_ID="smg-transport-agency"
```

macOS/Linux:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
export FIREBASE_PROJECT_ID="smg-transport-agency"
```

Store service account JSON outside the repo. Never commit it.

## Required Services And IAM

Enable/check these in Firebase Console or Google Cloud Console:

- Firebase Authentication.
- Google sign-in provider.
- Cloud Firestore.
- Firebase Hosting.
- Cloud Functions for Firebase.
- Firebase Remote Config.
- Firebase App Check.
- Vertex AI API.
- Billing if Cloud Functions or Vertex AI requires it.

Required IAM:

- Deploying account: Firebase Hosting deploy, Firestore rules/indexes deploy, Storage rules deploy, Cloud Functions deploy.
- Functions runtime service account: Firestore access, Remote Config read access, Vertex AI User.
- Admin/deploy account publishing Remote Config: Remote Config Admin.
- If using a service account to deploy functions: service account user/act-as permission for the runtime service account.

## Super Admin Bootstrap

Verified script: `scripts/set-super-admin.ts`.

- Fixed target: `francis@pwavwe.com`.
- Uses Firebase Admin SDK.
- Sets custom claims: `role: "super_admin"` and `superAdmin: true` (`admin: true` is also set for compatibility).
- Creates/updates `users/{uid}` with `email`, `role: "super_admin"`, `status: "active"`, and `updatedAt`.
- Idempotent and safe to rerun.
- Fails clearly if the Auth user does not exist yet.

Manual run after credentials are configured and Francis signs in once:

```powershell
npm run admin:set-super-admin
```

If user not found, sign in once with Google using `francis@pwavwe.com`, then rerun the command.

## Vertex AI Chatbot

Readiness:

- Vertex AI is called only from `functions/src/index.ts` through the Cloud Function `askChatbot`.
- No Vertex credentials or private keys are exposed in frontend code.
- The model name is configurable via Remote Config key `chatbot_model_name`.
- Fallback model/config exists when Remote Config is unavailable.
- Disabled state returns an offline support message and escalation contact.
- Escalation contact is returned to the UI and linked to WhatsApp.
- Chat sessions and messages are protected by Firestore rules.
- Rate limiting exists in both the Cloud Function and local fallback path.
- App Check is wired through `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` and `ENFORCE_APP_CHECK`; enforcement still needs Firebase Console setup and a redeploy.

Vertex AI is not fully production-ready until the Vertex AI API, billing, IAM, Remote Config values, and Functions deploy are complete.

## Remote Config Keys

Expected keys are present in code and docs:

- `chatbot_enabled`
- `chatbot_model_name`
- `chatbot_temperature`
- `chatbot_max_output_tokens`
- `chatbot_system_prompt_version`
- `chatbot_welcome_message`
- `chatbot_escalation_enabled`
- `chatbot_escalation_whatsapp`
- `booking_enabled`
- `maintenance_mode`
- `enable_seat_selection`
- `enable_online_payments`
- `enable_rescheduling`
- `enable_cancellations`
- `featured_routes`
- `announcement_banner_enabled`
- `announcement_banner_text`

If Remote Config cannot be published from the admin UI/code yet, create the keys manually in Firebase Console:

1. Open Firebase Console for `smg-transport-agency`.
2. Go to Build > Remote Config.
3. Add each key above as a parameter with a safe default.
4. Save and publish the template.

## npm Audit Status

Non-forced audit fix was attempted. No safe non-breaking fix cleared the remaining findings.

Root app audit currently reports 16 vulnerabilities:

- `esbuild`/`vite`/`vitest`: moderate; npm recommends force-upgrading to Vitest 4, a breaking major upgrade.
- `nodemailer`: high/critical advisory set; npm recommends force-upgrading to Nodemailer 9, a breaking major upgrade.
- `next` transitive `postcss`: moderate; npm recommends a breaking/unsafe forced path, not suitable for this pass.
- `firebase-admin` transitive `uuid` chain: moderate; npm recommends a breaking major upgrade.

Functions audit currently reports 9 moderate vulnerabilities under the `firebase-admin` transitive `uuid` chain. npm only offers a forced breaking path, so it was documented rather than applied.

Do not run `npm audit fix --force` without a separate Firebase Functions/Next/Nodemailer upgrade branch and regression test pass.

## Verification This Pass

Passed:

- `npm run functions:build`
- `npm run typecheck`
- `npm run lint`
- `npm test` - 28 tests passed.
- `npm run build` - production build passed on Next.js `15.5.20`.

Checked but not completed:

- Firebase deployment: not rerun because this shell is not authenticated for Firebase deployment.
- Super-admin promotion: rerun after Francis signed in once; still failed because this shell has no valid Admin SDK/ADC credentials.
- Google Cloud CLI: `gcloud` is not installed or not on PATH in this shell.
- Service-account JSON: no Admin service-account JSON containing a `private_key` field was found under the user profile outside the repo.
- Firebase CLI version check: installed `15.19.1`, latest npm version `15.22.4`; update before deploying.

## Final Local Command Sequence

Authenticate Firebase:

```powershell
firebase login
firebase projects:list
firebase use smg-transport-agency
```

Build and verify:

```powershell
npm run functions:build
npm run typecheck
npm run lint
npm test
npm run build
```

Deploy:

```powershell
npm run deploy:rules
npm run deploy:functions
npm run deploy:hosting
```

Promote super admin:

```powershell
npm run admin:set-super-admin
```

If needed after promotion:

```powershell
npm run deploy:hosting
```

## Current Deployment Status

- Deployment succeeded: no. Deployment was not retried in this shell because Firebase authentication/Admin credentials are not configured here.
- Deployed URL: not available from this session.
- `francis@pwavwe.com` promoted: no. The Auth user should now exist, but the bootstrap still needs valid Admin SDK/ADC credentials.
- Vertex AI ready: code is ready; Google Cloud service/API/IAM/Remote Config/Functions deploy still need local console setup.
- Remote Config ready: keys exist in code/docs; publish values manually or through the admin tooling after credentials/IAM are ready.
- App Check ready: code is wired; Console provider setup and enforcement redeploy are still required.
