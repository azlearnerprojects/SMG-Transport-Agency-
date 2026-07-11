# Admin Config Guide

## Overview

SMG uses two config layers:

- `siteConfig/public`: safe values that the website can read, such as support contact details, booking toggles, announcement text, public Paystack key, and chatbot welcome/escalation settings.
- Server-only config: private keys, payment secrets, Vertex AI credentials, and other sensitive settings. Store these in Firebase Functions environment variables or Secret Manager, not Firestore client-readable documents.

The `/admin/config` page updates safe public settings through `/api/admin/config`. The route verifies the server-side admin session, validates input, writes audit logs, and can publish matching Firebase Remote Config values when requested.

The top of `/admin/config` also shows a **Production Readiness** diagnostic panel.
Use it before deploy to catch local blockers that staff can act on: canonical
domain drift, demo mode, missing Firebase client/Admin auth config, non-live
Paystack keys, weak signing secrets, booking switches left closed, and public
payment config still in test mode. The panel reports secret presence and mode
only; it does not display secret values.

## Public Variables

- Site name
- Support phone
- Support WhatsApp number
- Support email
- Company address
- Booking enabled
- Maintenance mode
- Booking window open/closed
- Cancellation window
- Rescheduling window
- Default currency
- Default timezone
- Service fee
- Tax percentage
- Featured routes
- Announcement banner
- Emergency travel notice
- Payment gateway mode
- Paystack public key only
- SMS provider enabled
- Email provider enabled
- Chatbot enabled
- Chatbot escalation contact
- Chatbot response tone
- Chatbot welcome message

## Server-Only Variables

- Firebase service account credentials
- Paystack secret key and webhook secret
- SMTP password
- SMS provider private API key
- Vertex AI service credentials
- Any private system prompt text or internal policy not intended for customers

## Remote Config Keys

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

If publishing from the admin UI is unavailable because Admin SDK credentials or
Remote Config IAM are not ready, create the keys manually in Firebase Console:

1. Open project `smg-transport-agency`.
2. Go to Build > Remote Config.
3. Add each parameter above with a safe default.
4. Save, review, and publish the template.

The code contains fallbacks for the chatbot model, temperature, token limit,
welcome message, escalation contact, booking flags, and maintenance mode, but
production should still publish explicit defaults before launch.

## Safe Update Flow

1. Sign in at `/admin/login` with a Firebase account that has admin custom claims.
2. Open `/admin/config`.
3. Update only public/safe settings.
4. Confirm dangerous actions when prompted: maintenance mode, disabled bookings, or live payments.
5. Enable "Publish matching Remote Config keys" only when the Firebase Admin SDK has permission to publish Remote Config.
6. Review `auditLogs` after high-impact changes.

## Chatbot Model Updates

Use `/admin/chatbot`. Only `super_admin` can change model name, temperature, max output tokens, or system prompt version. These values are written server-side and can be published to Firebase Remote Config. The browser never receives Vertex credentials.
