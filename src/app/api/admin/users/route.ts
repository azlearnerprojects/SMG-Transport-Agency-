import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { getStaffSession } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/roles';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { getFirestoreUser, listFirestoreUsers, updateAuthClaims } from '@/lib/admin/user-profiles';
import { z } from 'zod';

/** GET /api/admin/users - list Firestore user profiles for admin role screens. */
export const GET = withErrorHandling(async () => {
  const session = await getStaffSession();
  if (!isAdminRole(session?.role)) {
    return jsonError('Not authorised.', 403);
  }

  const result = await listFirestoreUsers();
  return jsonOk(result);
});

const createSchema = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(2).max(80).optional(),
  role: z.enum(['super_admin', 'admin', 'staff', 'support_agent']),
});

/**
 * POST /api/admin/users - super-admin-only: provision a staff/admin account
 * by email. Creates (or reuses) the Firebase Auth user, sets role claims and
 * the Firestore profile. The person then signs in with Google using that
 * email — password login is not used for staff in production.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const session = await getStaffSession();
  if (session?.role !== 'super_admin') {
    return jsonError('Only a Super Admin can add admins or staff.', 403);
  }

  const auth = await getAdminAuth();
  const firestore = await getAdminFirestore();
  if (!auth || !firestore) {
    return jsonError('Firebase Admin SDK is not configured on this server.', 503);
  }

  const { email, displayName, role } = createSchema.parse(await req.json());
  const normalisedEmail = email.trim().toLowerCase();

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(normalisedEmail);
  } catch {
    userRecord = await auth.createUser({
      email: normalisedEmail,
      displayName: displayName ?? normalisedEmail.split('@')[0],
    });
  }

  const existing = await getFirestoreUser(userRecord.uid);
  await updateAuthClaims(userRecord.uid, role, 'active');

  const now = new Date().toISOString();
  await firestore.collection('users').doc(userRecord.uid).set(
    {
      uid: userRecord.uid,
      email: normalisedEmail,
      displayName: displayName ?? existing?.displayName ?? userRecord.displayName ?? normalisedEmail.split('@')[0],
      role,
      status: 'active',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
    { merge: true },
  );

  await firestore.collection('auditLogs').add({
    action: 'create_admin_user',
    performedByUid: session.uid ?? null,
    performedByEmail: session.email,
    targetUid: userRecord.uid,
    targetEmail: normalisedEmail,
    previousValue: existing ? { role: existing.role, status: existing.status } : null,
    newValue: { role, status: 'active' },
    createdAt: now,
  });

  const user = await getFirestoreUser(userRecord.uid);
  return jsonOk({ user, existed: Boolean(existing) });
});
