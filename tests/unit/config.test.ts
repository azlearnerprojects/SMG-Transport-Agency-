import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

async function loadConfig(env: Record<string, string>) {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV, ...env };
  return import('@/lib/config');
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe('Paystack config validation', () => {
  it('accepts matching live key modes', async () => {
    const { getPaystackConfig } = await loadConfig({
      PAYSTACK_PUBLIC_KEY: 'pk_live_example',
      PAYSTACK_SECRET_KEY: 'sk_live_example',
      PAYSTACK_WEBHOOK_SECRET: 'sk_live_example',
    });

    expect(getPaystackConfig().mode).toBe('live');
  });

  it('rejects mixed test and live key modes', async () => {
    const { getPaystackConfig } = await loadConfig({
      PAYSTACK_PUBLIC_KEY: 'pk_live_example',
      PAYSTACK_SECRET_KEY: 'sk_test_example',
      PAYSTACK_WEBHOOK_SECRET: 'sk_test_example',
    });

    expect(() => getPaystackConfig()).toThrow(/same test\/live mode/);
  });
});

describe('production config validation', () => {
  it('requires live Paystack payments outside demo mode', async () => {
    const { assertProductionReadyConfig } = await loadConfig({
      NEXT_PUBLIC_DEMO_MODE: 'false',
      PAYMENT_PROVIDER: 'mock',
      NEXT_PUBLIC_APP_URL: 'https://smgagencygh.com',
    });

    expect(() => assertProductionReadyConfig()).toThrow(/PAYMENT_PROVIDER must be paystack/);
  });

  it('accepts the minimum production payment configuration', async () => {
    const { assertProductionReadyConfig } = await loadConfig({
      NEXT_PUBLIC_DEMO_MODE: 'false',
      PAYMENT_PROVIDER: 'paystack',
      NEXT_PUBLIC_APP_URL: 'https://smgagencygh.com',
      PAYSTACK_PUBLIC_KEY: 'pk_live_example',
      PAYSTACK_SECRET_KEY: 'sk_live_example',
      PAYSTACK_WEBHOOK_SECRET: 'sk_live_example',
      ADMIN_SESSION_SECRET: 'a'.repeat(32),
      QR_VERIFY_SECRET: 'b'.repeat(32),
    });

    expect(() => assertProductionReadyConfig()).not.toThrow();
  });
});
