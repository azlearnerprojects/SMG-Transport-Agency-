import { logger } from '@/lib/logger';

/**
 * SMS provider abstraction.
 *
 * Ghanaian providers (Arkesel, Hubtel, etc.) can be plugged in by extending the
 * switch below. Until credentials are supplied (SMS_PROVIDER / SMS_API_KEY /
 * SMS_SENDER_ID), messages are logged rather than sent so the booking flow is
 * never blocked by SMS configuration.
 */
export interface SmsMessage {
  to: string;
  body: string;
}

export async function sendSms(message: SmsMessage): Promise<{ delivered: boolean }> {
  const provider = process.env.SMS_PROVIDER;
  const apiKey = process.env.SMS_API_KEY;

  if (!provider || !apiKey) {
    logger.info('SMS (demo, not delivered)', { to: message.to, body: message.body });
    return { delivered: false };
  }

  try {
    switch (provider) {
      // Example shape — implement the concrete HTTP call when a provider is chosen.
      case 'arkesel':
      case 'hubtel':
      default:
        logger.warn(`SMS provider "${provider}" not yet implemented; message not sent.`, { to: message.to });
        return { delivered: false };
    }
  } catch (err) {
    logger.error('SMS delivery failed', { to: message.to, error: String(err) });
    return { delivered: false };
  }
}
