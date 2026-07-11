import { getDb } from '@/lib/db';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { verifyFirebaseBearer } from '@/lib/auth/firebase-request';
import { DEMO_MODE } from '@/lib/config';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

/**
 * POST /api/customer/bookings - return bookings for the signed-in customer.
 * Demo mode still accepts an email because demo auth is client-side.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const limit = rateLimit(`custbookings:${clientIp(req)}`, 30, 60);
  if (!limit.allowed) return jsonError('Too many requests. Please wait a moment.', 429);

  if (!DEMO_MODE) {
    let firebaseUser: Awaited<ReturnType<typeof verifyFirebaseBearer>> = null;
    try {
      firebaseUser = await verifyFirebaseBearer(req);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('not configured')) {
        return jsonError('Customer sign-in is temporarily unavailable (server credentials).', 503);
      }
      return jsonError('Your sign-in could not be verified. Please sign in again.', 401);
    }
    if (!firebaseUser) return jsonError('Please sign in to view your bookings.', 401);

    const db = getDb();
    const bookings = await db.listBookings({ customerId: firebaseUser.uid });
    return jsonOk({ bookings });
  }

  const db = getDb();
  const body = z.object({ email: z.string().email().optional() }).parse(await readJson(req));
  const email = body.email;
  if (!email) return jsonError('Email is required.', 422);
  const key = email.trim().toLowerCase();
  const customer = (await db.listCustomers()).find((user) => user.email.toLowerCase() === key);
  const all = await db.listBookings();
  const bookings = all.filter(
    (booking) => (customer && booking.customerId === customer.id) || booking.passenger.email.toLowerCase() === key,
  );
  return jsonOk({ bookings });
});
