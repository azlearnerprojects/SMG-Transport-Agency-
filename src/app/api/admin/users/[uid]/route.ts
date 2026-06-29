import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { getStaffSession } from '@/lib/auth/session';
import { ACCOUNT_STATUSES, AUTH_ROLES } from '@/lib/auth/roles';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { getFirestoreUser, updateAuthClaims } from '@/lib/admin/user-profiles';
import type { AccountStatus, AuthRole } from '@/lib/types';
import { z } from 'zod';

const schema = z
  .object({
    role: z.enum(AUTH_ROLES as [AuthRole, ...AuthRole[]]).optional(),
    status: z.enum(ACCOUNT_STATUSES as [AccountStatus, ...AccountStatus[]]).optional(),
  })
  .refine((value) => Boolean(value.role || value.status), {
    message: 'Provide a role or status update.',
  });

/** PATCH /api/admin/users/[uid] - super-admin-only role/status update. */
export const PATCH = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ uid: string }> }) => {
    const session = await getStaffSession();
    if (session?.role !== 'super_admin') {
      return jsonError('Only a Super Admin can update user roles or status.', 403);
    }

    const firestore = await getAdminFirestore();
    if (!firestore) return jsonError('Firebase Admin SDK is not configured on this server.', 503);

    const { uid } = await ctx.params;
    const patch = schema.parse(await req.json());
    const previous = await getFirestoreUser(uid);
    if (!previous) return jsonError('User profile not found.', 404);

    const nextRole = patch.role ?? previous.role;
    const nextStatus = patch.status ?? previous.status;

    if (session.uid === uid && (nextRole !== 'super_admin' || nextStatus === 'disabled')) {
      return jsonError('You cannot remove or disable your own Super Admin access.', 409);
    }

    const now = new Date().toISOString();
    await updateAuthClaims(uid, nextRole, nextStatus);
    await firestore.collection('users').doc(uid).set(
      {
        role: nextRole,
        status: nextStatus,
        updatedAt: now,
      },
      { merge: true },
    );

    await firestore.collection('auditLogs').add({
      action: 'update_user_access',
      performedByUid: session.uid ?? null,
      performedByEmail: session.email,
      targetUid: uid,
      targetEmail: previous.email,
      previousValue: { role: previous.role, status: previous.status },
      newValue: { role: nextRole, status: nextStatus },
      createdAt: now,
    });

    const updated = await getFirestoreUser(uid);
    return jsonOk({ user: updated });
  },
);
