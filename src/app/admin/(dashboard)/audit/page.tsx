import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { getStaffSession } from '@/lib/auth/session';
import { AdminPageTitle, DataTable, RestrictedNotice, type Column } from '@/components/admin/admin-ui';
import { formatDate, formatTime } from '@/lib/format';
import type { AuditLog } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin · Audit Logs' };

export default async function AdminAudit() {
  const session = await getStaffSession();
  if (session?.role !== 'super_admin') return <RestrictedNotice module="Audit Logs" />;

  const db = getDb();
  const logs = db.listAuditLogs();

  const cols: Column<AuditLog>[] = [
    { key: 'at', header: 'When', render: (l) => `${formatDate(l.at)} ${formatTime(l.at)}` },
    { key: 'actor', header: 'Actor' },
    { key: 'action', header: 'Action' },
    { key: 'target', header: 'Target' },
    { key: 'detail', header: 'Detail' },
  ];

  return (
    <>
      <AdminPageTitle title="Audit Logs" description="Append-only record of staff actions. (Demo logs accumulate as you use the dashboard.)" />
      <DataTable columns={cols} rows={logs} empty="No audit entries yet — sign in/out or check in a ticket to generate some." />
    </>
  );
}
