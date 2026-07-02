import { getDb } from '@/lib/db';
import { createBookingSchema } from '@/lib/schemas';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { z } from 'zod';

const bodySchema = createBookingSchema.extend({ holdId: z.string().min(1) });

/**
 * POST /api/bookings — create a pending booking from a held seat selection.
 * Server re-validates the hold and recomputes the fare; the browser-supplied
 * totals are never trusted.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const body = bodySchema.parse(await req.json());
  const db = getDb();
  const result = await db.createBooking({
    scheduleId: body.scheduleId,
    seatIds: body.seatIds,
    seatCategory: body.seatCategory,
    passenger: {
      fullName: body.passenger.fullName,
      phone: body.passenger.phone,
      email: body.passenger.email,
      idType: body.passenger.idType,
      idNumber: body.passenger.idNumber || undefined,
      emergencyContactName: body.passenger.emergencyContactName || undefined,
      emergencyContactPhone: body.passenger.emergencyContactPhone || undefined,
      specialAssistance: body.passenger.specialAssistance || undefined,
    },
    holdId: body.holdId,
    sessionId: body.sessionId,
    promoCode: body.promoCode || undefined,
  });
  if (!result.ok) return jsonError(result.error ?? 'Could not create booking.', 409);
  return jsonOk({ booking: result.booking });
});
