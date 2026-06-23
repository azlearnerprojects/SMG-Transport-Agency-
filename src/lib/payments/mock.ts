import type { InitializeParams, InitializeResult, PaymentProvider, VerifyResult } from './types';
import { generateId } from '@/lib/ids';

/**
 * Mock payment provider for DEMO mode.
 *
 * It performs NO real transactions. `initialize` issues a fake provider reference
 * and points the customer at the in-app simulated checkout page. `verify` reports
 * success for references it issued, unless the reference is explicitly marked as a
 * simulated failure (prefix "FAIL-"). This lets us demonstrate both the happy path
 * and failed-payment recovery without any external service.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async initialize(params: InitializeParams): Promise<InitializeResult> {
    const providerReference = `MOCK-${generateId('ref').toUpperCase()}`;
    const url = new URL('/payment/checkout', params.callbackUrl.split('/api')[0] || params.callbackUrl);
    url.searchParams.set('ref', providerReference);
    url.searchParams.set('booking', params.bookingReference);
    url.searchParams.set('amount', params.amount.toFixed(2));
    url.searchParams.set('method', params.method);
    return { providerReference, authorizationUrl: url.toString() };
  }

  async verify(providerReference: string): Promise<VerifyResult> {
    if (providerReference.startsWith('FAIL-')) {
      return { status: 'failed', providerReference, amount: 0, currency: 'GHS' };
    }
    return { status: 'success', providerReference, amount: 0, currency: 'GHS' };
  }

  verifyWebhookSignature(): boolean {
    // No signed webhooks in demo mode.
    return true;
  }
}
