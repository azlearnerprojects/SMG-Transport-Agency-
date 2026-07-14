import { getDb } from '@/lib/db';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { sendRescheduleSms } from '@/lib/sms';
import { z } from 'zod';

const schema = z.object({
  newScheduleId: z.string().min(1),
  seatIds: z.array(z.string().min(1)).min(1).max(5),
});

/** POST /api/bookings/[reference]/reschedule — move a confirmed booking to a new trip. */
export const POST = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ reference: string }> }) => {
    const { reference } = await ctx.params;
    const body = schema.parse(await req.json());
    const db = getDb();
    const result = await db.rescheduleBooking(reference, body.newScheduleId, body.seatIds, 'customer');
    if (!result.ok) return jsonError(result.error ?? 'Could not reschedule.', 409);
    if (result.booking) {
      void sendRescheduleSms(result.booking).catch(() => undefined);
    }
    return jsonOk({ booking: result.booking });
  },
);
