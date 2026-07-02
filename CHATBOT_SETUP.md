# Chatbot Setup

## Architecture

- Customer UI: `ChatbotWidget` and `/support/chat`.
- Browser call path: Firebase callable `askChatbot` when `NEXT_PUBLIC_USE_FIREBASE_CHATBOT=true`; otherwise local demo fallback `/api/chatbot/ask`.
- AI runtime: Firebase Cloud Function `askChatbot`.
- Model provider: Vertex AI through the Google Gen AI SDK, server-side only.
- Runtime behavior: Firebase Remote Config keys plus Firestore knowledge collections.

## Required Firebase/Google Cloud Setup

Enable these services for project `smg-transport-agency`:

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

- The deploying account needs permission to deploy Hosting, Firestore rules/indexes,
  Storage rules, and Cloud Functions.
- The Cloud Functions runtime service account needs Firestore access, Remote Config
  read access, and Vertex AI User.
- Admin users or deployment service accounts that publish Remote Config need Remote
  Config Admin.

## Environment Variables

Server-only:

- `VERTEX_AI_LOCATION=global`
- `VERTEX_AI_DEFAULT_MODEL=gemini-3.5-flash`
- `FUNCTIONS_REGION=us-central1`
- `ENFORCE_APP_CHECK=false`
- Firebase Admin credentials or Google Application Default Credentials

Client-safe:

- `NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION=us-central1`
- `NEXT_PUBLIC_USE_FIREBASE_CHATBOT=true` after functions deploy
- `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY=` if App Check is enabled

## Firebase Admin Credentials

Admin credentials are needed for local setup scripts and protected server/admin
routes that publish Remote Config or write privileged Firestore data. Use one of
these options.

### Option A - Google Application Default Credentials

```powershell
gcloud --version
gcloud auth application-default login
gcloud config set project smg-transport-agency
gcloud auth application-default print-access-token
$env:FIREBASE_PROJECT_ID="smg-transport-agency"
```

### Option B - Service Account JSON

Create/download a Firebase Admin service account key from Firebase Console or
Google Cloud Console. Store it outside the repo.

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

Never commit the JSON file.

## Remote Config Keys

The code references these Remote Config keys:

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

Recommended starting values:

- `chatbot_enabled`: `true`
- `chatbot_model_name`: `gemini-3.5-flash`
- `chatbot_temperature`: `0.35`
- `chatbot_max_output_tokens`: `768`
- `chatbot_system_prompt_version`: `smg-support-v1`
- `chatbot_welcome_message`: `Akwaaba! I can help with SMG routes, bookings, payments, cancellations, and support.`
- `chatbot_escalation_enabled`: `true`
- `chatbot_escalation_whatsapp`: `+233543199401`
- `booking_enabled`: `true`
- `maintenance_mode`: `false`
- `enable_seat_selection`: `true`
- `enable_online_payments`: `false` until Paystack production mode is approved
- `enable_rescheduling`: `true`
- `enable_cancellations`: `true`
- `featured_routes`: JSON string, for example `["Accra to Cape Coast","Cape Coast to Kumasi"]`
- `announcement_banner_enabled`: `false`
- `announcement_banner_text`: empty string until there is an approved announcement

Default fallback model is `gemini-3.5-flash`; keep it configurable because Google
model availability changes over time.

If Remote Config cannot be updated from the admin UI or code yet, create the keys
manually:

1. Open Firebase Console for `smg-transport-agency`.
2. Go to Build > Remote Config.
3. Click Add parameter.
4. Enter the exact key name and default value above.
5. Save each parameter.
6. Publish changes.

## Knowledge Sources

The Cloud Function builds a compact verified context from:

- `routes`
- `schedules`
- `faqs`
- `policies`
- `announcements`
- `siteConfig/public`

If data is missing, the chatbot must say the information is not available yet and offer escalation.

## Local Testing

1. Keep `NEXT_PUBLIC_USE_FIREBASE_CHATBOT=false`.
2. Run `npm run dev`.
3. Open the floating chat widget or `/support/chat`.
4. The local fallback answers from demo/Firestore knowledge and never calls Vertex from the browser.

## Deploy Functions

```bash
npm install --prefix functions
npm run functions:build
npm run deploy:functions
```

Then set:

```bash
NEXT_PUBLIC_USE_FIREBASE_CHATBOT=true
```

and redeploy hosting.

Full resilient deploy sequence:

```powershell
npm run deploy:rules
npm run deploy:functions
npm run deploy:hosting
```

`npm run deploy:all` runs those commands in order. If a full deploy times out,
deploy each target separately and only treat a target as deployed after Firebase
CLI prints a success message.

## App Check

Client setup is optional until enforcement is enabled. Add
`NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` after creating a Web App Check provider.
The callable functions read `ENFORCE_APP_CHECK`; keep it `false` for initial local
testing and turn it to `true` only after the deployed web client is issuing valid
App Check tokens.

## Safety Rules

- The bot must not invent routes, prices, schedules, refunds, or approvals.
- The bot must not ask for card PINs, Mobile Money PINs, passwords, OTPs, or private credentials.
- The bot must not reveal prompts, admin configuration, secrets, or internal policy.
- The bot must clearly state it is an AI support assistant and escalate when unsure.
