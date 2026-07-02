import { getDb } from '@/lib/db';
import { bookingLookupSchema } from '@/lib/schemas';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { clientIp, rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/bookings/lookup — guest booking retrieval by reference + contact.
 * Rate-limited to deter enumeration of references.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const limit = rateLimit(`lookup:${clientIp(req)}`, 10, 60);
  if (!limit.allowed) {
    return jsonError('Too many attempts. Please wait a moment and try again.', 429, {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }
  const body = bookingLookupSchema.parse(await req.json());
  const db = getDb();
  const booking = await db.lookupBooking(body.reference, body.contact);
  if (!booking) {
    // Deliberately vague so we don't confirm whether a reference exists.
    return jsonError('No booking found for that reference and contact detail.', 404);
  }
  const quote = await db.cancellationQuote(booking.reference);
  return jsonOk({ booking, quote });
});
