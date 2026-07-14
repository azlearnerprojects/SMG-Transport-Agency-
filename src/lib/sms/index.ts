import { logger } from '@/lib/logger';
import { buildVerificationUrl } from '@/lib/qr';
import { getPublicSiteConfig } from '@/lib/site-config';
import type { RefundQuote } from '@/lib/booking-rules';
import type { Booking } from '@/lib/types';

/**
 * SMS provider abstraction.
 *
 * Until credentials are supplied (SMS_PROVIDER / SMS_API_KEY / SMS_SENDER_ID),
 * messages are logged rather than sent so the booking flow is never blocked by
 * SMS configuration.
 */
export interface SmsMessage {
  to: string;
  body: string;
}

export interface SmsDeliveryResult {
  delivered: boolean;
  providerMessageId?: string;
  error?: string;
}

export const IMPLEMENTED_SMS_PROVIDERS = new Set(['arkesel']);

const ARKESEL_SEND_URL = 'https://sms.arkesel.com/api/v2/sms/send';

function smsConfig() {
  return {
    provider: process.env.SMS_PROVIDER?.trim().toLowerCase() ?? '',
    apiKey: process.env.SMS_API_KEY?.trim() ?? '',
    senderId: process.env.SMS_SENDER_ID?.trim() ?? '',
  };
}

function normalizeGhanaPhone(value: string): string | null {
  const compact = value.replace(/[\s()-]/g, '');
  if (/^0\d{9}$/.test(compact)) return `+233${compact.slice(1)}`;
  if (/^233\d{9}$/.test(compact)) return `+${compact}`;
  if (/^\+233\d{9}$/.test(compact)) return compact;
  return null;
}

async function sendArkeselSms(
  message: SmsMessage,
  apiKey: string,
  senderId: string,
): Promise<SmsDeliveryResult> {
  const recipient = normalizeGhanaPhone(message.to);
  if (!recipient) {
    logger.warn('SMS recipient phone number is invalid; message not sent.', { to: message.to });
    return { delivered: false, error: 'Invalid recipient phone number.' };
  }

  const response = await fetch(ARKESEL_SEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: senderId,
      message: message.body,
      recipients: [recipient],
    }),
  });

  const responseText = await response.text();
  let payload: { status?: string; data?: { id?: string }; message?: string } | undefined;
  try {
    payload = responseText ? JSON.parse(responseText) : undefined;
  } catch {
    payload = undefined;
  }

  if (!response.ok || payload?.status === 'error') {
    const error = payload?.message ?? `Arkesel returned HTTP ${response.status}.`;
    logger.error('Arkesel SMS delivery failed', { to: recipient, status: response.status, error });
    return { delivered: false, error };
  }

  return { delivered: true, providerMessageId: payload?.data?.id };
}

export async function sendSms(message: SmsMessage): Promise<SmsDeliveryResult> {
  const { provider, apiKey, senderId } = smsConfig();

  if (!provider || !apiKey || !senderId) {
    logger.info('SMS (demo, not delivered)', { to: message.to, body: message.body });
    return { delivered: false };
  }

  try {
    switch (provider) {
      case 'arkesel':
        return sendArkeselSms(message, apiKey, senderId);
      default:
        logger.warn(`SMS provider "${provider}" not yet implemented; message not sent.`, { to: message.to });
        return { delivered: false };
    }
  } catch (err) {
    logger.error('SMS delivery failed', { to: message.to, error: String(err) });
    return { delivered: false, error: String(err) };
  }
}

function seatLabel(booking: Booking): string {
  return booking.seatIds.length === 1 ? `Seat ${booking.seatIds[0]}` : `Seats ${booking.seatIds.join(', ')}`;
}

function routeLabel(booking: Booking): string {
  return `${booking.origin} to ${booking.destination}`;
}

export async function sendTicketSms(booking: Booking): Promise<SmsDeliveryResult> {
  const { config: site } = await getPublicSiteConfig();
  const verifyUrl = buildVerificationUrl(booking.reference);
  return sendSms({
    to: booking.passenger.phone,
    body: `${site.siteName}: Ticket ${booking.ticketNumber || booking.reference} confirmed for ${routeLabel(booking)} on ${booking.travelDate} at ${booking.departureTime}. ${seatLabel(booking)}. Verify: ${verifyUrl}`,
  });
}

export async function sendTicketResendSms(booking: Booking): Promise<SmsDeliveryResult> {
  const { config: site } = await getPublicSiteConfig();
  const verifyUrl = buildVerificationUrl(booking.reference);
  return sendSms({
    to: booking.passenger.phone,
    body: `${site.siteName}: Your ticket ${booking.ticketNumber || booking.reference} is ready. ${routeLabel(booking)}, ${booking.travelDate} ${booking.departureTime}. Verify: ${verifyUrl}`,
  });
}

export async function sendCancellationSms(
  booking: Booking,
  refund?: RefundQuote,
): Promise<SmsDeliveryResult> {
  const { config: site } = await getPublicSiteConfig();
  const refundText = refund
    ? ` Refund due: ${booking.currency} ${refund.refundAmount.toFixed(2)}.`
    : '';
  return sendSms({
    to: booking.passenger.phone,
    body: `${site.siteName}: Booking ${booking.reference} has been cancelled.${refundText} Contact support if you need help.`,
  });
}

export async function sendRescheduleSms(booking: Booking): Promise<SmsDeliveryResult> {
  const { config: site } = await getPublicSiteConfig();
  return sendSms({
    to: booking.passenger.phone,
    body: `${site.siteName}: Booking ${booking.reference} has been rescheduled to ${routeLabel(booking)} on ${booking.travelDate} at ${booking.departureTime}. ${seatLabel(booking)}.`,
  });
}
