import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { getStaffSession } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/roles';
import { listFirestoreUsers } from '@/lib/admin/user-profiles';

/** GET /api/admin/users - list Firestore user profiles for admin role screens. */
export const GET = withErrorHandling(async () => {
  const session = await getStaffSession();
  if (!isAdminRole(session?.role)) {
    return jsonError('Not authorised.', 403);
  }

  const result = await listFirestoreUsers();
  return jsonOk(result);
});
