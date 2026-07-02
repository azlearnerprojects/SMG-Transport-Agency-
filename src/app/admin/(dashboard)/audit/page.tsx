import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { getStaffSession } from '@/lib/auth/session';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { AdminPageTitle, DataTable, RestrictedNotice, type Column } from '@/components/admin/admin-ui';
import { formatDate, formatTime } from '@/lib/format';
import type { AuditLog } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin - Audit Logs' };

export default async function AdminAudit() {
  const session = await getStaffSession();
  if (session?.role !== 'super_admin') return <RestrictedNotice module="Audit Logs" />;

  const firestore = await getAdminFirestore();
  const db = getDb();
  // Operational audit trail (check-ins, settings changes) + role/config audit logs.
  let logs: AuditLog[] = await db.listAuditLogs().catch(() => []);

  if (firestore) {
    const snapshot = await firestore.collection('auditLogs').get();
    const roleLogs = snapshot.docs.map((doc) => {
      const data = doc.data();
      const previousValue = data.previousValue ? JSON.stringify(data.previousValue) : 'none';
      const newValue = data.newValue ? JSON.stringify(data.newValue) : 'none';
      return {
        id: doc.id,
        at: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
        actor: String(data.performedByEmail ?? 'system'),
        action: String(data.action ?? 'audit'),
        target: String(data.targetEmail ?? data.targetUid ?? data.targetId ?? 'unknown'),
        detail: `${previousValue} -> ${newValue}`,
      };
    });
    logs = [...logs, ...roleLogs].sort((a, b) => b.at.localeCompare(a.at));
  }

  const cols: Column<AuditLog>[] = [
    { key: 'at', header: 'When', render: (log) => `${formatDate(log.at)} ${formatTime(log.at)}` },
    { key: 'actor', header: 'Actor' },
    { key: 'action', header: 'Action' },
    { key: 'target', header: 'Target' },
    { key: 'detail', header: 'Detail' },
  ];

  return (
    <>
      <AdminPageTitle title="Audit Logs" description="Append-only record of staff actions and role changes." />
      <DataTable columns={cols} rows={logs} empty="No audit entries yet." />
    </>
  );
}
