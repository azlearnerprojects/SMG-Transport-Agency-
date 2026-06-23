import { getDb } from '@/lib/db';
import { jsonOk, withErrorHandling } from '@/lib/api';
import { z } from 'zod';

/** POST /api/payments/fail — used by the demo checkout to simulate a failed/abandoned payment. */
export const POST = withErrorHandling(async (req: Request) => {
  const { bookingReference } = z.object({ bookingReference: z.string().min(1) }).parse(await req.json());
  const db = getDb();
  db.failPayment(bookingReference, 'Payment was not completed (simulated failure).');
  return jsonOk({ failed: true });
});
