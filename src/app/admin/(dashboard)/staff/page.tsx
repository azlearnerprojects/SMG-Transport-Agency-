import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { getStaffSession } from '@/lib/auth/session';
import { AdminPageTitle, DataTable, RestrictedNotice, type Column } from '@/components/admin/admin-ui';
import { Badge } from '@/components/ui/badge';
import type { StaffProfile } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin · Staff' };

export default async function AdminStaff() {
  const session = await getStaffSession();
  if (session?.role !== 'super_admin') return <RestrictedNotice module="Staff Accounts" />;

  const db = getDb();
  const staff = db.listStaff();

  const cols: Column<StaffProfile>[] = [
    { key: 'fullName', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (s) => <Badge variant="navy">{s.role.replace(/_/g, ' ')}</Badge> },
    { key: 'active', header: 'Status', render: (s) => <Badge variant={s.active ? 'success' : 'muted'}>{s.active ? 'Active' : 'Disabled'}</Badge> },
  ];

  return (
    <>
      <AdminPageTitle title="Staff Accounts" description="Role-based staff directory. Roles map to Firebase custom claims in production." />
      <DataTable columns={cols} rows={staff} empty="No staff accounts." />
    </>
  );
}
