import type { Metadata } from 'next';
import { getStaffSession } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/auth/roles';
import { listFirestoreUsers } from '@/lib/admin/user-profiles';
import { AdminPageTitle, RestrictedNotice } from '@/components/admin/admin-ui';
import { UsersRolesClient } from '@/components/admin/users-roles-client';

export const metadata: Metadata = { title: 'Admin - Users & Roles' };

export default async function AdminUsersPage() {
  const session = await getStaffSession();
  if (!isAdminRole(session?.role)) return <RestrictedNotice module="Users & Roles" />;

  const { configured, users } = await listFirestoreUsers();

  return (
    <>
      <AdminPageTitle
        title="Users & Roles"
        description="Search profiles, review account status, and manage role access."
      />
      <UsersRolesClient
        initialUsers={users}
        configured={configured}
        currentRole={session!.role}
        currentUid={session!.uid}
      />
    </>
  );
}
