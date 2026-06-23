import { getDb } from '@/lib/db';
import { contactSchema } from '@/lib/schemas';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/** POST /api/contact — store a support message. Honeypot + rate-limit for spam control. */
export const POST = withErrorHandling(async (req: Request) => {
  const limit = rateLimit(`contact:${clientIp(req)}`, 5, 60);
  if (!limit.allowed) {
    return jsonError('Too many messages. Please wait a moment before trying again.', 429);
  }
  const body = contactSchema.parse(await req.json());

  // Honeypot: if the hidden field is filled, silently accept but drop (bot).
  if (body.website && body.website.length > 0) {
    logger.warn('Contact honeypot triggered', { ip: clientIp(req) });
    return jsonOk({ received: true });
  }

  const db = getDb();
  const message = db.addSupportMessage({
    name: body.name,
    email: body.email,
    phone: body.phone || undefined,
    subject: body.subject,
    message: body.message,
  });
  return jsonOk({ id: message.id, received: true });
});
