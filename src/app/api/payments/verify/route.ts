import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { getPaymentProvider } from '@/lib/payments';
import { sendTicketEmail } from '@/lib/email';
import { sendSms } from '@/lib/sms';
import { APP_URL } from '@/lib/config';
import { logger } from '@/lib/logger';

/**
 * Server-side payment verification. NEVER trusts a "success" claim from the
 * browser: it independently asks the provider, validates the amount, then
 * confirms the booking idempotently. Used by both the browser (POST, JSON) and
 * the provider redirect callback (GET, browser redirect).
 */
async function verifyAndConfirm(providerReference: string, bookingReference?: string) {
  const db = getDb();
  const provider = getPaymentProvider();
  const result = await provider.verify(providerReference);

  const booking = bookingReference ? db.getBookingByReference(bookingReference) : undefined;

  if (result.status !== 'success') {
    if (bookingReference) db.failPayment(bookingReference, `Payment ${result.status} at provider.`);
    return { ok: false as const, status: result.status };
  }

  // Amount guard (skip for mock provider which reports 0).
  if (booking && result.amount > 0 && Math.abs(result.amount - booking.total) > 0.01) {
    if (bookingReference) db.failPayment(bookingReference, 'Paid amount did not match booking total.');
    return { ok: false as const, status: 'failed' as const };
  }

  const confirm = db.confirmPayment({ providerReference, bookingReference });
  if (!confirm.ok || !confirm.booking) {
    return { ok: false as const, status: 'failed' as const, error: confirm.error };
  }

  // Fire-and-forget notifications; failures must not block confirmation.
  void sendTicketEmail(confirm.booking).catch(() => undefined);
  void sendSms({
    to: confirm.booking.passenger.phone,
    body: `SMG: Booking ${confirm.booking.reference} confirmed. Seat ${confirm.booking.seatIds.join(', ')} on ${confirm.booking.travelDate} ${confirm.booking.departureTime}.`,
  }).catch(() => undefined);

  logger.info('Payment verified & booking confirmed', { booking: confirm.booking.reference });
  return { ok: true as const, booking: confirm.booking };
}

const postSchema = z.object({
  providerReference: z.string().min(1),
  bookingReference: z.string().min(1).optional(),
});

export const POST = withErrorHandling(async (req: Request) => {
  const body = postSchema.parse(await req.json());
  const outcome = await verifyAndConfirm(body.providerReference, body.bookingReference);
  if (!outcome.ok) return jsonError(outcome.error ?? 'Payment could not be verified.', 402, { status: outcome.status });
  return jsonOk({ booking: outcome.booking });
});

/** Provider redirect callback (e.g. Paystack callback_url). */
export const GET = withErrorHandling(async (req: Request) => {
  const url = new URL(req.url);
  const providerReference = url.searchParams.get('reference') ?? url.searchParams.get('ref');
  const bookingReference = url.searchParams.get('booking') ?? undefined;
  if (!providerReference) {
    return NextResponse.redirect(`${APP_URL}/payment/status?status=failed`);
  }
  const outcome = await verifyAndConfirm(providerReference, bookingReference);
  const ref = outcome.ok ? outcome.booking.reference : bookingReference ?? '';
  const status = outcome.ok ? 'success' : 'failed';
  return NextResponse.redirect(`${APP_URL}/payment/status?status=${status}&ref=${encodeURIComponent(ref)}`);
});
