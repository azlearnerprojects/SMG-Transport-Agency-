import { getDb } from '@/lib/db';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { clientIp, rateLimit } from '@/lib/rate-limit';

/** POST /api/bookings/[reference]/cancel — request cancellation (policy-checked, refund quoted). */
export const POST = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ reference: string }> }) => {
    const limit = rateLimit(`cancel:${clientIp(req)}`, 10, 60);
    if (!limit.allowed) return jsonError('Too many attempts. Please wait and try again.', 429);

    const { reference } = await ctx.params;
    const db = getDb();
    const result = db.cancelBooking(reference, 'customer');
    if (!result.ok) return jsonError(result.error ?? 'Could not cancel booking.', 409);
    return jsonOk({ booking: result.booking, refund: result.refund });
  },
);
