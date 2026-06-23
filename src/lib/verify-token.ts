import crypto from 'node:crypto';

/**
 * Short signed token bound to a booking reference. The QR code encodes a
 * verification URL containing this token — NOT passenger or payment data — so a
 * scanned ticket can be validated server-side without leaking sensitive info.
 */
const SECRET = process.env.QR_VERIFY_SECRET ?? process.env.PAYSTACK_WEBHOOK_SECRET ?? 'smg-demo-verify-secret';

export function signReference(reference: string): string {
  return crypto.createHmac('sha256', SECRET).update(reference).digest('hex').slice(0, 16);
}

export function verifyReferenceToken(reference: string, token: string): boolean {
  const expected = signReference(reference);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
