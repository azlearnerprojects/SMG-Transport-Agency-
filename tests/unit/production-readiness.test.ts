import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PUBLIC_SITE_CONFIG } from '@/lib/site-config';
import type { PublicSiteConfig } from '@/lib/types';

const ORIGINAL_ENV = { ...process.env };

function productionEnv(overrides: Record<string, string> = {}) {
  return {
    NEXT_PUBLIC_DEMO_MODE: 'false',
    PAYMENT_PROVIDER: 'paystack',
    NEXT_PUBLIC_APP_URL: 'https://smgagencygh.com',
    PRODUCTION_CANONICAL_HOSTS: 'smgagencygh.com,www.smgagencygh.com',
    NEXT_PUBLIC_FIREBASE_API_KEY: 'firebase-api-key',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'smg-transport-agency.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'smg-transport-agency',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'smg-transport-agency.appspot.com',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abc',
    FIREBASE_PROJECT_ID: 'smg-transport-agency',
    FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk@example.iam.gserviceaccount.com',
    FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
    PAYSTACK_PUBLIC_KEY: 'pk_live_example',
    PAYSTACK_SECRET_KEY: 'sk_live_example',
    PAYSTACK_WEBHOOK_SECRET: 'sk_live_example',
    ADMIN_SESSION_SECRET: 'a'.repeat(32),
    QR_VERIFY_SECRET: 'b'.repeat(32),
    ENFORCE_APP_CHECK: 'false',
    ...overrides,
  };
}

function launchSiteConfig(overrides: Partial<PublicSiteConfig> = {}): PublicSiteConfig {
  return {
    ...DEFAULT_PUBLIC_SITE_CONFIG,
    siteName: 'SMG Transport Agency',
    tagline: 'Your Journey. Your Seat. Your Time.',
    supportPhone: '+233543199401',
    supportWhatsapp: '+233543199401',
    supportEmail: 'support@smgagencygh.com',
    supportHours: '24/7',
    companyAddress: 'Cape Coast, Ghana',
    socialFacebook: '',
    socialInstagram: '',
    socialTwitter: '',
    socialTiktok: '',
    bookingEnabled: true,
    maintenanceMode: false,
    bookingOpeningEnabled: true,
    cancellationWindowHours: 6,
    reschedulingWindowHours: 12,
    defaultCurrency: 'GHS',
    defaultTimezone: 'Africa/Accra',
    serviceFee: 5,
    taxPercentage: 0,
    featuredRoutes: ['Accra to Cape Coast'],
    announcementBannerEnabled: false,
    announcementBannerText: '',
    emergencyTravelNotice: '',
    paymentGatewayMode: 'live',
    paystackPublicKey: 'pk_live_example',
    smsProviderEnabled: false,
    emailProviderEnabled: false,
    chatbotEnabled: true,
    chatbotEscalationContact: '+233543199401',
    chatbotResponseTone: 'friendly',
    chatbotWelcomeMessage: 'Akwaaba! I can help with SMG bookings and support.',
    updatedAt: '2026-07-08T00:00:00.000Z',
    ...overrides,
  };
}

async function loadReadiness(env: Record<string, string>) {
  vi.resetModules();
  process.env = env as NodeJS.ProcessEnv;
  return import('@/lib/production-readiness');
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe('production readiness checks', () => {
  it('accepts the required live payment, Firebase, canonical, and admin config', async () => {
    const { summarizeProductionReadiness } = await loadReadiness(productionEnv());

    const summary = summarizeProductionReadiness({
      siteConfig: launchSiteConfig(),
      siteConfigConfigured: true,
    });

    expect(summary.ready).toBe(true);
    expect(summary.counts.fail).toBe(0);
    expect(summary.counts.warning).toBe(0);
  });

  it('blocks a canonical host outside the approved production host list', async () => {
    const { summarizeProductionReadiness } = await loadReadiness(
      productionEnv({ NEXT_PUBLIC_APP_URL: 'https://preview.example.com' }),
    );

    const summary = summarizeProductionReadiness({
      siteConfig: launchSiteConfig(),
      siteConfigConfigured: true,
    });

    expect(summary.ready).toBe(false);
    expect(summary.checks.find((check) => check.id === 'canonical-host')?.status).toBe('fail');
  });

  it('blocks missing Firebase browser auth config in non-demo mode', async () => {
    const { summarizeProductionReadiness } = await loadReadiness(
      productionEnv({ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: '' }),
    );

    const summary = summarizeProductionReadiness({
      siteConfig: launchSiteConfig(),
      siteConfigConfigured: true,
    });

    expect(summary.ready).toBe(false);
    expect(summary.checks.find((check) => check.id === 'firebase-client')?.status).toBe('fail');
  });

  it('blocks admin payment config that is still in test mode', async () => {
    const { summarizeProductionReadiness } = await loadReadiness(productionEnv());

    const summary = summarizeProductionReadiness({
      siteConfig: launchSiteConfig({
        paymentGatewayMode: 'test',
        paystackPublicKey: 'pk_test_example',
      }),
      siteConfigConfigured: true,
    });

    expect(summary.ready).toBe(false);
    expect(summary.checks.find((check) => check.id === 'admin-launch-switches')?.status).toBe('fail');
    expect(summary.checks.find((check) => check.id === 'admin-paystack-public-key')?.status).toBe('fail');
  });
});
