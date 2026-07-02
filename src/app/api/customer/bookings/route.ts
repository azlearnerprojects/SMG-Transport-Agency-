import { getDb } from '@/lib/db';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

/**
 * POST /api/customer/bookings — return bookings for a customer email.
 *
 * DEMO note: this trusts the supplied email because the demo auth is
 * client-side. In production this endpoint must read the authenticated user's
 * Firebase ID token instead of accepting an email in the body.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const limit = rateLimit(`custbookings:${clientIp(req)}`, 30, 60);
  if (!limit.allowed) return jsonError('Too many requests. Please wait a moment.', 429);

  const { email } = z.object({ email: z.string().email() }).parse(await req.json());
  const db = getDb();
  const key = email.trim().toLowerCase();
  // Match by customerId (seeded users) OR by passenger email on the booking.
  const customer = (await db.listCustomers()).find((u) => u.email.toLowerCase() === key);
  const all = await db.listBookings();
  const bookings = all.filter(
    (b) => (customer && b.customerId === customer.id) || b.passenger.email.toLowerCase() === key,
  );
  return jsonOk({ bookings });
});
