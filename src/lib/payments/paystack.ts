import crypto from 'node:crypto';
import type { InitializeParams, InitializeResult, PaymentProvider, VerifyResult } from './types';
import type { PaymentMethod } from '@/lib/types';

/**
 * Paystack adapter (TEST MODE first).
 *
 * Uses the Paystack REST API. Amounts are sent in the minor unit (pesewas), i.e.
 * GHS * 100. The secret key NEVER reaches the browser — this module is only
 * imported by server code. Webhook signatures are validated with HMAC-SHA512 of
 * the raw body using the secret key, per Paystack's documentation.
 *
 * Do not use live keys during development. See PAYMENT_SETUP.md.
 */
const PAYSTACK_BASE = 'https://api.paystack.co';

function methodToChannels(method: PaymentMethod): string[] {
  switch (method) {
    case 'mobile_money':
      return ['mobile_money'];
    case 'card':
      return ['card'];
    case 'bank_transfer':
      return ['bank', 'bank_transfer'];
    default:
      return ['card', 'mobile_money'];
  }
}

export class PaystackProvider implements PaymentProvider {
  readonly name = 'paystack';
  private readonly secret: string;

  constructor() {
    this.secret = process.env.PAYSTACK_SECRET_KEY ?? '';
    if (!this.secret) {
      throw new Error('PAYSTACK_SECRET_KEY is not set. See PAYMENT_SETUP.md.');
    }
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.secret}`,
      'Content-Type': 'application/json',
    };
  }

  async initialize(params: InitializeParams): Promise<InitializeResult> {
    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        email: params.email,
        amount: Math.round(params.amount * 100), // pesewas
        currency: params.currency,
        reference: `${params.bookingReference}-${Date.now()}`,
        callback_url: params.callbackUrl,
        channels: methodToChannels(params.method),
        metadata: { bookingReference: params.bookingReference },
      }),
    });
    if (!res.ok) {
      throw new Error(`Paystack initialize failed (${res.status}).`);
    }
    const json = (await res.json()) as {
      data: { reference: string; authorization_url: string };
    };
    return {
      providerReference: json.data.reference,
      authorizationUrl: json.data.authorization_url,
    };
  }

  async verify(providerReference: string): Promise<VerifyResult> {
    const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(providerReference)}`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      return { status: 'failed', providerReference, amount: 0, currency: 'GHS' };
    }
    const json = (await res.json()) as {
      data: { status: string; amount: number; currency: string; channel?: string };
    };
    const status =
      json.data.status === 'success' ? 'success' : json.data.status === 'abandoned' ? 'pending' : 'failed';
    return {
      status,
      providerReference,
      amount: json.data.amount / 100,
      currency: json.data.currency,
      raw: json.data,
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    if (!signature) return false;
    const hash = crypto.createHmac('sha512', this.secret).update(rawBody).digest('hex');
    // Constant-time compare to avoid timing attacks.
    const a = Buffer.from(hash);
    const b = Buffer.from(signature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}
