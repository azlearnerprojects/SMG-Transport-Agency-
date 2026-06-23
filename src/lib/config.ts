/**
 * Central runtime configuration. All environment access funnels through here so
 * the rest of the app reads typed, documented values instead of raw process.env.
 */

function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

/**
 * DEMO_MODE drives the data + payment layer selection.
 * When true (default), the app runs entirely on the in-memory mock layer with no
 * external services. When false, Firebase + a real payment provider are expected.
 */
export const DEMO_MODE = envFlag(process.env.NEXT_PUBLIC_DEMO_MODE, true);

export const PAYMENT_PROVIDER = (process.env.PAYMENT_PROVIDER ?? 'mock') as
  | 'mock'
  | 'paystack';

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/** How long a selected seat is held before an unpaid booking expires. */
export const SEAT_HOLD_TTL_SECONDS = Number(process.env.SEAT_HOLD_TTL_SECONDS ?? 600);

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
  // Placeholder contact details — replace with CEO-approved values before launch.
  supportPhone: '+233 00 000 0000',
  whatsapp: '+233 00 000 0000',
  email: 'support@smgtransport.com',
  office: 'University of Cape Coast area, Cape Coast, Ghana (placeholder)',
  social: {
    facebook: '#',
    instagram: '#',
    twitter: '#',
    tiktok: '#',
  },
} as const;
