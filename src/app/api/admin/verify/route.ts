import { getDb } from '@/lib/db';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { getStaffSession, roleAllowed } from '@/lib/auth/session';

/** GET /api/admin/verify?ref= — staff ticket verification by reference (role-gated). */
export const GET = withErrorHandling(async (req: Request) => {
  const session = await getStaffSession();
  if (!roleAllowed(session, ['ticket_inspector', 'booking_officer', 'operations_manager'])) {
    return jsonError('Not authorised.', 403);
  }
  const ref = new URL(req.url).searchParams.get('ref');
  if (!ref) return jsonError('Provide a booking reference.', 400);
  const db = getDb();
  return jsonOk({ result: await db.verifyTicket(ref) });
});
