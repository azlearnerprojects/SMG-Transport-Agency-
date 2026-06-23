import { getDb } from '@/lib/db';
import { holdSeatsSchema } from '@/lib/schemas';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';

/** POST /api/holds — atomically hold selected seats for the current session. */
export const POST = withErrorHandling(async (req: Request) => {
  const body = holdSeatsSchema.parse(await req.json());
  const db = getDb();
  const result = db.holdSeats(body);
  if (!result.ok) {
    return jsonError(
      result.conflictSeats && result.conflictSeats.length
        ? `Seat(s) ${result.conflictSeats.join(', ')} are no longer available.`
        : 'Unable to hold these seats.',
      409,
      { conflictSeats: result.conflictSeats },
    );
  }
  return jsonOk({ hold: result.hold });
});
