/**
 * Central runtime configuration. All environment access funnels through here so
 * the rest of the app reads typed, documented values instead of raw process.env.
 */

function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

function envValue(name: string): string {
  return process.env[name]?.trim() ?? '';
}

function requireEnv(name: string): string {
  const value = envValue(name);
  if (!value) {
    throw new Error(`${name} is not set. See .env.example and DEPLOYMENT.md.`);
  }
  return value;
}

function requireStrongSecret(name: string): string {
  const value = requireEnv(name);
  if (value.length < 32) {
    throw new Error(`${name} must be at least 32 characters for production.`);
  }
  return value;
}

type PaystackMode = 'test' | 'live';
type PaymentProviderName = 'mock' | 'paystack';

function keyMode(value: string, prefix: 'pk' | 'sk'): PaystackMode | null {
  if (value.startsWith(`${prefix}_test_`)) return 'test';
  if (value.startsWith(`${prefix}_live_`)) return 'live';
  return null;
}

function paymentProvider(value: string | undefined): PaymentProviderName {
  if (!value) return 'mock';
  if (value === 'mock' || value === 'paystack') return value;
  throw new Error(`Unsupported PAYMENT_PROVIDER "${value}". Expected "mock" or "paystack".`);
}

/**
 * DEMO_MODE drives the data + payment layer selection.
 * When true (default), the app runs entirely on the in-memory mock layer with no
 * external services. When false, Firebase + a real payment provider are expected.
 */
export const DEMO_MODE = envFlag(process.env.NEXT_PUBLIC_DEMO_MODE, true);

export const PAYMENT_PROVIDER = paymentProvider(process.env.PAYMENT_PROVIDER);

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/** How long a selected seat is held before an unpaid booking expires. */
export const SEAT_HOLD_TTL_SECONDS = Number(process.env.SEAT_HOLD_TTL_SECONDS ?? 600);

export interface PaystackConfig {
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  mode: PaystackMode;
}

export function getPaystackConfig(): PaystackConfig {
  const publicKey = requireEnv('PAYSTACK_PUBLIC_KEY');
  const secretKey = requireEnv('PAYSTACK_SECRET_KEY');
  const webhookSecret = envValue('PAYSTACK_WEBHOOK_SECRET') || secretKey;

  const publicMode = keyMode(publicKey, 'pk');
  const secretMode = keyMode(secretKey, 'sk');
  const webhookMode = keyMode(webhookSecret, 'sk');

  if (!publicMode) {
    throw new Error('PAYSTACK_PUBLIC_KEY must start with pk_test_ or pk_live_.');
  }
  if (!secretMode) {
    throw new Error('PAYSTACK_SECRET_KEY must start with sk_test_ or sk_live_.');
  }
  if (!webhookMode) {
    throw new Error('PAYSTACK_WEBHOOK_SECRET must start with sk_test_ or sk_live_ when set.');
  }
  if (publicMode !== secretMode || webhookMode !== secretMode) {
    throw new Error('Paystack public, secret, and webhook keys must all use the same test/live mode.');
  }

  return { publicKey, secretKey, webhookSecret, mode: secretMode };
}

export function assertProductionReadyConfig(): void {
  if (DEMO_MODE) {
    throw new Error('NEXT_PUBLIC_DEMO_MODE must be false for production.');
  }
  if (PAYMENT_PROVIDER !== 'paystack') {
    throw new Error('PAYMENT_PROVIDER must be paystack for production payments.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(APP_URL);
  } catch {
    throw new Error('NEXT_PUBLIC_APP_URL must be a valid absolute URL.');
  }
  if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
    throw new Error('NEXT_PUBLIC_APP_URL must be the public HTTPS production URL.');
  }

  const paystack = getPaystackConfig();
  if (paystack.mode !== 'live') {
    throw new Error('Production payments require live Paystack keys.');
  }

  requireStrongSecret('ADMIN_SESSION_SECRET');
  requireStrongSecret('QR_VERIFY_SECRET');
}

export const CURRENCY = {
  code: 'GHS',
  symbol: 'GH₵',
} as const;

/**
 * Cancellation / rescheduling policy values.
 * IMPORTANT: these are admin-configurable PLACEHOLDERS pending CEO approval.
 * They are surfaced in the admin "System Settings" module and must be reviewed
 * before launch (see CONTENT_REPLACEMENT_CHECKLIST.md).
 */
export const DEFAULT_POLICY = {
  cancellationCutoffHours: 6,
  reschedulingCutoffHours: 12,
  cancellationFeePercent: 15,
  maxReschedules: 2,
  refundProcessingDays: 7,
  nonRefundableFareCategories: ['promo'] as string[],
} as const;

export const BRAND = {
  name: 'SMG Transport Agency',
  shortName: 'SMG',
  tagline: 'Your Journey. Your Seat. Your Time.',
  supportPhone: '+233 54 319 9401',
  whatsapp: '+233 54 319 9401',
  email: 'projects@azlearner.me',
  office: 'University of Cape Coast (UCC), Cape Coast, Ghana',
  supportHours: '24/7',
  social: {
    facebook: 'https://facebook.com/smgtransportagency',
    instagram: 'https://instagram.com/smgtransportagency',
    twitter: 'https://x.com/smgtransport',
    tiktok: 'https://tiktok.com/@smgtransportagency',
  },
} as const;
