import { getDb } from '@/lib/db';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { sendTicketEmail } from '@/lib/email';
import { sendTicketResendSms } from '@/lib/sms';
import { clientIp, rateLimit } from '@/lib/rate-limit';

/** POST /api/bookings/[reference]/resend — re-send the e-ticket email. */
export const POST = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ reference: string }> }) => {
    const limit = rateLimit(`resend:${clientIp(req)}`, 5, 60);
    if (!limit.allowed) return jsonError('Please wait before requesting another email.', 429);

    const { reference } = await ctx.params;
    const db = getDb();
    const booking = await db.getBookingByReference(reference);
    if (!booking) return jsonError('Booking not found.', 404);
    if (booking.status !== 'confirmed' && booking.status !== 'checked_in') {
      return jsonError('Tickets are only available for confirmed bookings.', 409);
    }
    const [email, sms] = await Promise.all([
      sendTicketEmail(booking),
      sendTicketResendSms(booking),
    ]);
    return jsonOk({
      delivered: email.delivered || sms.delivered,
      emailDelivered: email.delivered,
      smsDelivered: sms.delivered,
      to: booking.passenger.email,
      phone: booking.passenger.phone,
    });
  },
);
