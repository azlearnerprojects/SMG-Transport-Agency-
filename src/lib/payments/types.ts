import type { PaymentMethod } from '@/lib/types';

export interface InitializeParams {
  bookingReference: string;
  amount: number; // GHS, two-decimal
  currency: string;
  email: string;
  method: PaymentMethod;
  callbackUrl: string;
}

export interface InitializeResult {
  providerReference: string;
  /** URL the customer is sent to in order to authorise payment. */
  authorizationUrl: string;
}

export interface VerifyResult {
  status: 'success' | 'failed' | 'pending';
  providerReference: string;
  amount: number;
  currency: string;
  method?: PaymentMethod;
  raw?: unknown;
}

/**
 * A payment provider. New Ghanaian providers (e.g. Hubtel, Flutterwave) can be
 * added by implementing this interface — the booking/payment flow never needs to
 * change because it only depends on these three operations.
 */
export interface PaymentProvider {
  readonly name: string;
  initialize(params: InitializeParams): Promise<InitializeResult>;
  verify(providerReference: string): Promise<VerifyResult>;
  /** Validate an inbound webhook payload signature. */
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean;
}
