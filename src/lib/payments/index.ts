import { PAYMENT_PROVIDER } from '@/lib/config';
import type { PaymentProvider } from './types';
import { MockPaymentProvider } from './mock';
import { PaystackProvider } from './paystack';

/**
 * Resolve the active payment provider from configuration. The booking flow only
 * ever depends on the PaymentProvider interface, so swapping providers is a
 * one-line change here plus an env var. The Paystack provider is only
 * instantiated when selected (its constructor requires a secret key), so the
 * mock demo never needs Paystack credentials.
 */
let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;
  cached = PAYMENT_PROVIDER === 'paystack' ? new PaystackProvider() : new MockPaymentProvider();
  return cached;
}

export type { PaymentProvider } from './types';
