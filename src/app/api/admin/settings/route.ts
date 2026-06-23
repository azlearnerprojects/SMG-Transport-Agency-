import { getDb } from '@/lib/db';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { getStaffSession, roleAllowed } from '@/lib/auth/session';
import { z } from 'zod';

const schema = z.object({
  cancellationCutoffHours: z.coerce.number().min(0).max(168),
  reschedulingCutoffHours: z.coerce.number().min(0).max(168),
  cancellationFeePercent: z.coerce.number().min(0).max(100),
  maxReschedules: z.coerce.number().int().min(0).max(10),
  refundProcessingDays: z.coerce.number().int().min(0).max(60),
  seatHoldTtlSeconds: z.coerce.number().int().min(60).max(3600),
});

/** POST /api/admin/settings — update configurable policy values (role-gated). */
export const POST = withErrorHandling(async (req: Request) => {
  const session = await getStaffSession();
  if (!roleAllowed(session, ['operations_manager', 'finance_officer'])) {
    return jsonError('Not authorised.', 403);
  }
  const patch = schema.parse(await req.json());
  const db = getDb();
  const updated = db.updateSettings(patch);
  db.addAudit({ actor: session!.email, action: 'update_settings', target: 'systemSettings', detail: JSON.stringify(patch) });
  return jsonOk({ settings: updated });
});
