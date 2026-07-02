import { getDb } from '@/lib/db';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { getPaymentProvider } from '@/lib/payments';
import { sendTicketEmail } from '@/lib/email';
import { logger } from '@/lib/logger';

/**
 * POST /api/payments/webhook — provider-to-server confirmation.
 *
 * The raw body is read verbatim and its signature validated before anything is
 * trusted. Confirmation is idempotent, so a webhook arriving after the redirect
 * verification simply no-ops. This is the authoritative confirmation path.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const raw = await req.text();
  const signature =
    req.headers.get('x-paystack-signature') ?? req.headers.get('x-webhook-signature');
  const provider = getPaymentProvider();

  if (!provider.verifyWebhookSignature(raw, signature)) {
    logger.warn('Rejected webhook with invalid signature');
    return jsonError('Invalid signature.', 401);
  }

  let event: { event?: string; data?: { reference?: string; metadata?: { bookingReference?: string } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return jsonError('Invalid payload.', 400);
  }

  if (event.event === 'charge.success' && event.data?.reference) {
    const db = getDb();
    const confirm = await db.confirmPayment({
      providerReference: event.data.reference,
      bookingReference: event.data.metadata?.bookingReference,
    });
    if (confirm.ok && confirm.booking) {
      void sendTicketEmail(confirm.booking).catch(() => undefined);
      logger.info('Webhook confirmed booking', { booking: confirm.booking.reference });
    }
  }

  // Always 200 quickly so the provider does not retry unnecessarily.
  return jsonOk({ received: true });
});
