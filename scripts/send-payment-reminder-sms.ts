/**
 * Send a manual SMS reminder to bookings still waiting for payment.
 *
 * Run:
 *   npx tsx scripts/send-payment-reminder-sms.ts --dry-run
 *   npx tsx scripts/send-payment-reminder-sms.ts
 *
 * Credentials: FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY,
 * or GOOGLE_APPLICATION_CREDENTIALS, or gcloud/Firebase Application Default
 * Credentials. SMS settings are read from .env.local / .env.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { Booking } from '../src/lib/types';

const ARKESEL_SEND_URL = 'https://sms.arkesel.com/api/v2/sms/send';
const DRY_RUN = process.argv.includes('--dry-run');
const RESEND = process.argv.includes('--resend');

interface SmsDeliveryResult {
  delivered: boolean;
  providerMessageId?: string;
  error?: string;
}

type ReminderBooking = Booking & {
  smsNotifications?: {
    paymentReminderSentAt?: string;
  };
};

function loadEnvFile(fileName: string) {
  const path = resolve(process.cwd(), fileName);
  if (!existsSync(path)) return;
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function loadFirebaseCliAdcIfPresent() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return;
  const appData = process.env.APPDATA;
  if (!appData) return;
  const firebaseDir = resolve(appData, 'firebase');
  if (!existsSync(firebaseDir)) return;
  const adcFile = readdirSync(firebaseDir).find((name) => name.endsWith('_application_default_credentials.json'));
  if (adcFile) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = resolve(firebaseDir, adcFile);
  }
}

function normalizeGhanaPhone(value: string): string | null {
  const compact = value.replace(/[\s()-]/g, '');
  if (/^0\d{9}$/.test(compact)) return `+233${compact.slice(1)}`;
  if (/^233\d{9}$/.test(compact)) return `+${compact}`;
  if (/^\+233\d{9}$/.test(compact)) return compact;
  return null;
}

function maskPhone(value: string): string {
  const compact = value.replace(/\D/g, '');
  if (compact.length <= 4) return '****';
  return `${'*'.repeat(Math.max(compact.length - 4, 0))}${compact.slice(-4)}`;
}

function firstName(booking: Booking): string {
  return booking.passenger.fullName.trim().split(/\s+/)[0] || 'traveller';
}

function seatLabel(booking: Booking): string {
  return booking.seatIds.length === 1 ? `seat ${booking.seatIds[0]}` : `seats ${booking.seatIds.join(', ')}`;
}

function routeLabel(booking: Booking): string {
  return `${booking.origin} to ${booking.destination}`;
}

function reviewUrl(booking: Booking): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://smgagencygh.com').replace(/\/+$/, '');
  return `${appUrl}/book/review/${encodeURIComponent(booking.reference)}`;
}

function reminderBody(booking: Booking): string {
  return [
    'SMG Travel:',
    `Hi ${firstName(booking)},`,
    `a gentle reminder to complete payment for ${routeLabel(booking)} (${seatLabel(booking)}), ref ${booking.reference},`,
    'so we can keep your seat reserved.',
    `Pay: ${reviewUrl(booking)}`,
  ].join(' ');
}

async function sendArkeselSms(to: string, body: string): Promise<SmsDeliveryResult> {
  const provider = process.env.SMS_PROVIDER?.trim().toLowerCase();
  const apiKey = process.env.SMS_API_KEY?.trim();
  const senderId = process.env.SMS_SENDER_ID?.trim();
  if (provider !== 'arkesel') {
    return { delivered: false, error: `SMS_PROVIDER must be "arkesel"; got "${provider || '(empty)'}".` };
  }
  if (!apiKey || !senderId) {
    return { delivered: false, error: 'SMS_API_KEY and SMS_SENDER_ID must be configured.' };
  }

  const recipient = normalizeGhanaPhone(to);
  if (!recipient) return { delivered: false, error: 'Invalid Ghana phone number.' };

  const response = await fetch(ARKESEL_SEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: senderId,
      message: body,
      recipients: [recipient],
    }),
  });

  const responseText = await response.text();
  let payload: { status?: string; data?: { id?: string }; message?: string } | undefined;
  try {
    payload = responseText ? JSON.parse(responseText) : undefined;
  } catch {
    payload = undefined;
  }

  if (!response.ok || payload?.status === 'error') {
    return { delivered: false, error: payload?.message ?? `Arkesel returned HTTP ${response.status}.` };
  }

  return { delivered: true, providerMessageId: payload?.data?.id };
}

async function main() {
  loadEnvFile('.env.local');
  loadEnvFile('.env');
  loadFirebaseCliAdcIfPresent();

  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    process.env.GCLOUD_PROJECT ??
    process.env.GCP_PROJECT;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!getApps().length) {
    if (projectId && clientEmail && privateKey) {
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    } else {
      initializeApp({ credential: applicationDefault(), projectId });
    }
  }

  const db = getFirestore();
  const snap = await db.collection('bookings').where('status', '==', 'pending_payment').get();
  const candidates = snap.docs
    .map((doc) => ({ doc, booking: doc.data() as ReminderBooking }))
    .filter(({ booking }) => booking.paymentStatus !== 'successful')
    .filter(({ booking }) => typeof booking.passenger?.phone === 'string' && booking.passenger.phone.trim().length > 0)
    .filter(({ booking }) => RESEND || !booking.smsNotifications?.paymentReminderSentAt);

  console.log(`Project: ${projectId ?? '(ADC default project)'}`);
  console.log(`Mode: ${DRY_RUN ? 'dry run' : 'send'}${RESEND ? ' with resend' : ''}`);
  console.log(`Pending-payment bookings to remind: ${candidates.length}`);

  if (!candidates.length) return;

  for (const { booking } of candidates) {
    console.log(`- ${booking.reference} ${maskPhone(booking.passenger.phone)} ${routeLabel(booking)} ${seatLabel(booking)}`);
    if (DRY_RUN) {
      console.log(`  ${reminderBody(booking)}`);
    }
  }

  if (DRY_RUN) return;

  let delivered = 0;
  let failed = 0;
  const sentAt = new Date().toISOString();

  for (const { doc, booking } of candidates) {
    const body = reminderBody(booking);
    const result = await sendArkeselSms(booking.passenger.phone, body);
    if (result.delivered) {
      delivered += 1;
      await doc.ref.set(
        {
          smsNotifications: {
            paymentReminderSentAt: sentAt,
            paymentReminderProvider: 'arkesel',
            paymentReminderProviderMessageId: result.providerMessageId ?? null,
          },
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      console.log(`DELIVERED ${booking.reference} ${maskPhone(booking.passenger.phone)}`);
    } else {
      failed += 1;
      await doc.ref.set(
        {
          smsNotifications: {
            paymentReminderFailedAt: new Date().toISOString(),
            paymentReminderError: result.error ?? 'Unknown SMS delivery error.',
          },
        },
        { merge: true },
      );
      console.log(`FAILED ${booking.reference} ${maskPhone(booking.passenger.phone)} ${result.error ?? 'Unknown error'}`);
    }
    await sleep(150);
  }

  console.log(`Summary: delivered=${delivered} failed=${failed}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  if (/credential|GOOGLE_APPLICATION_CREDENTIALS|application default|private key|could not load/i.test(message)) {
    console.error('Firebase Admin credentials are not configured or are invalid.');
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS, configure gcloud ADC, or set FIREBASE_* service account env vars.');
  }
  console.error(message);
  process.exit(1);
});
