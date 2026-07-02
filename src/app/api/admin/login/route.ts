import { getDb } from '@/lib/db';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { setStaffSession } from '@/lib/auth/session';
import { isAdminRole, isAuthRole } from '@/lib/auth/roles';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { normaliseUserProfile } from '@/lib/admin/user-profiles';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { DEMO_MODE } from '@/lib/config';
import type { AccountStatus, AuthRole, StaffRole } from '@/lib/types';
import { z } from 'zod';

/**
 * Distinguish "the server can't authenticate to Firebase" (a deployment/creds
 * problem the operator must fix) from an ordinary bad/expired ID token (the
 * caller's problem). Credential/permission failures should surface as a clear
 * 503 and be logged with detail; token failures are a normal 401. Without this,
 * every Admin SDK error collapses into a generic 500 that hides the cause.
 */
function isCredentialError(err: unknown): boolean {
  const code = typeof (err as { code?: unknown })?.code === 'string' ? (err as { code: string }).code : '';
  const message = String((err as { message?: unknown })?.message ?? err);
  const haystack = `${code} ${message}`.toLowerCase();
  return [
    'could not load the default credentials',
    'default credentials',
    'getting metadata from plugin failed',
    'failed to determine project id',
    'permission_denied',
    'permission-denied',
    'unauthenticated',
    'insufficient permission',
    'invalid_grant',
    'credential implementation',
    'decoder routines',
    'private key',
    'error:0909006c',
    'service account',
  ].some((needle) => haystack.includes(needle));
}

const schema = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(1).optional(),
    idToken: z.string().min(10).optional(),
  })
  .refine((value) => Boolean(value.idToken || (value.email && value.password)), {
    message: 'Provide Google ID token or staff email/password.',
  });

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

  const { email, password, idToken } = schema.parse(await req.json());

  if (idToken) {
    const auth = await getAdminAuth();
    const firestore = await getAdminFirestore();
    if (!auth || !firestore) {
      return jsonError(
        'Staff sign-in is unavailable: the Firebase Admin SDK is not configured on this server.',
        503,
      );
    }

    let decoded;
    try {
      decoded = await auth.verifyIdToken(idToken, true);
    } catch (err) {
      if (isCredentialError(err)) {
        logger.error('Admin login: Firebase Admin credentials failed during token verification', {
          error: String(err),
        });
        return jsonError(
          'Staff sign-in is temporarily unavailable (server credentials). Please contact a Super Admin.',
          503,
        );
      }
      logger.warn('Admin login: ID token verification failed', { error: String(err) });
      return jsonError('Your Google sign-in could not be verified. Please sign in again.', 401);
    }

    const decodedEmail = decoded.email?.trim().toLowerCase();
    if (!decodedEmail) return jsonError('Google account did not include an email address.', 401);

    try {
      const userRef = firestore.collection('users').doc(decoded.uid);
      const snap = await userRef.get();
      const now = new Date().toISOString();
      const claimRole = isAuthRole(typeof decoded.role === 'string' ? decoded.role : undefined)
        ? (decoded.role as AuthRole)
        : undefined;

      if (!snap.exists) {
        await userRef.set({
          uid: decoded.uid,
          displayName: decoded.name ?? decodedEmail.split('@')[0],
          email: decodedEmail,
          photoURL: decoded.picture ?? '',
          role: claimRole ?? 'customer',
          status: 'active' satisfies AccountStatus,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        });
      } else {
        await userRef.set(
          {
            uid: decoded.uid,
            displayName: decoded.name ?? snap.get('displayName') ?? decodedEmail.split('@')[0],
            email: decodedEmail,
            photoURL: decoded.picture ?? snap.get('photoURL') ?? '',
            updatedAt: now,
            lastLoginAt: now,
          },
          { merge: true },
        );
      }

      const fresh = await userRef.get();
      const profile = normaliseUserProfile(decoded.uid, fresh.data() ?? {});
      const effectiveRole = claimRole ?? profile.role;
      const effectiveStatus = profile.status;

      if (effectiveStatus !== 'active') {
        return jsonError('This account is not active yet. Please contact a Super Admin.', 403);
      }
      if (!isAdminRole(effectiveRole)) {
        return jsonError('Access denied - this area is for authorized staff only.', 403);
      }

      await setStaffSession({
        uid: decoded.uid,
        email: decodedEmail,
        name: profile.displayName,
        role: effectiveRole as StaffRole,
        photoURL: profile.photoURL,
      });

      await firestore.collection('auditLogs').add({
        action: 'admin_login',
        performedByUid: decoded.uid,
        performedByEmail: decodedEmail,
        targetUid: decoded.uid,
        targetEmail: decodedEmail,
        previousValue: null,
        newValue: { role: effectiveRole, status: effectiveStatus },
        createdAt: now,
      });

      return jsonOk({ email: decodedEmail, role: effectiveRole, name: profile.displayName });
    } catch (err) {
      if (isCredentialError(err)) {
        logger.error('Admin login: Firebase Admin credentials/permissions failed during Firestore access', {
          error: String(err),
        });
        return jsonError(
          'Staff sign-in is temporarily unavailable (server database access). Please contact a Super Admin.',
          503,
        );
      }
      throw err;
    }
  }

  // Email/password staff login exists for DEMO mode only. In production the
  // sole path is Google sign-in verified above via the Firebase Admin SDK.
  if (!DEMO_MODE) {
    return jsonError('Password login is disabled. Please sign in with Google.', 403);
  }

  if (!email || !password) return jsonError('Provide staff email and password.', 400);
  const demoPassword = process.env.DEMO_ADMIN_PASSWORD ?? 'Demo!Admin2026';

  const db = getDb();
  const staff = (await db.listStaff()).find((s) => s.email.toLowerCase() === email.trim().toLowerCase() && s.active);

  if (!staff || !demoPassword || password !== demoPassword) {
    logger.warn('Failed admin login', { email });
    return jsonError('Invalid staff credentials.', 401);
  }

  await setStaffSession({ email: staff.email, role: staff.role, name: staff.fullName });
  await db.addAudit({ actor: staff.email, action: 'login', target: 'admin', detail: `Role: ${staff.role}` });
  return jsonOk({ email: staff.email, role: staff.role, name: staff.fullName });
});
