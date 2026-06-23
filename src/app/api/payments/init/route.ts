import { getDb } from '@/lib/db';
import { initPaymentSchema } from '@/lib/schemas';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { getPaymentProvider } from '@/lib/payments';
import { APP_URL } from '@/lib/config';
import { logger } from '@/lib/logger';

/**
 * POST /api/payments/init — initialise a payment with the active provider and
 * record it against the booking. Returns the provider authorization URL.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const body = initPaymentSchema.parse(await req.json());
  const db = getDb();
  const booking = db.getBookingByReference(body.bookingReference);
  if (!booking) return jsonError('Booking not found.', 404);
  if (booking.status === 'confirmed') {
    return jsonOk({ alreadyPaid: true, authorizationUrl: `${APP_URL}/ticket/${booking.reference}` });
  }

  const provider = getPaymentProvider();
  const init = await provider.initialize({
    bookingReference: booking.reference,
    amount: booking.total,
    currency: booking.currency,
    email: booking.passenger.email,
    method: body.method,
    callbackUrl: `${APP_URL}/api/payments/verify`,
  });

  db.recordPaymentInit({
    bookingReference: booking.reference,
    provider: provider.name,
    method: body.method,
    providerReference: init.providerReference,
  });

  logger.info('Payment initialised', { booking: booking.reference, provider: provider.name, method: body.method });
  return jsonOk({ authorizationUrl: init.authorizationUrl, providerReference: init.providerReference });
});
