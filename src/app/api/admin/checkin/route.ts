import { getDb } from '@/lib/db';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { getStaffSession, roleAllowed } from '@/lib/auth/session';
import { z } from 'zod';

/** POST /api/admin/checkin — ticket inspector checks a passenger in. Server-side role gate. */
export const POST = withErrorHandling(async (req: Request) => {
  const session = await getStaffSession();
  if (!roleAllowed(session, ['ticket_inspector', 'operations_manager', 'booking_officer'])) {
    return jsonError('Not authorised.', 403);
  }
  const { reference } = z.object({ reference: z.string().min(1) }).parse(await req.json());
  const db = getDb();
  const result = db.checkIn(reference);
  if (!result.ok) return jsonError(result.error ?? 'Check-in failed.', 409);
  db.addAudit({ actor: session!.email, action: 'checkin', target: reference, detail: 'Passenger checked in' });
  return jsonOk({ checkedIn: true });
});
