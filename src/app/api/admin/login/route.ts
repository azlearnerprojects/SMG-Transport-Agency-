import { getDb } from '@/lib/db';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { setStaffSession } from '@/lib/auth/session';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

/**
 * POST /api/admin/login — DEMO staff login.
 *
 * Validates against the staff directory + the demo admin password from the
 * environment. No production password is hardcoded. In production this is
 * replaced by Firebase Auth + custom-claim role checks.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const limit = rateLimit(`adminlogin:${clientIp(req)}`, 8, 60);
  if (!limit.allowed) return jsonError('Too many attempts. Please wait and try again.', 429);

  const { email, password } = schema.parse(await req.json());
  const demoPassword = process.env.DEMO_ADMIN_PASSWORD;

  const db = getDb();
  const staff = db.listStaff().find((s) => s.email.toLowerCase() === email.trim().toLowerCase() && s.active);

  if (!staff || !demoPassword || password !== demoPassword) {
    logger.warn('Failed admin login', { email });
    return jsonError('Invalid staff credentials.', 401);
  }

  await setStaffSession({ email: staff.email, role: staff.role, name: staff.fullName });
  db.addAudit({ actor: staff.email, action: 'login', target: 'admin', detail: `Role: ${staff.role}` });
  return jsonOk({ email: staff.email, role: staff.role, name: staff.fullName });
});
