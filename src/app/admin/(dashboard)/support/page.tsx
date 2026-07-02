import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { AdminPageTitle, DataTable, type Column } from '@/components/admin/admin-ui';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import type { SupportMessage } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin · Support Inbox' };

export default async function AdminSupport() {
  const db = getDb();
  const messages = await db.listSupportMessages();

  const cols: Column<SupportMessage>[] = [
    { key: 'name', header: 'From', render: (m) => <><div className="font-medium text-navy">{m.name}</div><div className="text-xs text-muted-foreground">{m.email}</div></> },
    { key: 'subject', header: 'Subject' },
    { key: 'message', header: 'Message', render: (m) => <span className="line-clamp-2 max-w-md text-muted-foreground">{m.message}</span> },
    { key: 'status', header: 'Status', render: (m) => <Badge variant={m.status === 'new' ? 'warning' : m.status === 'resolved' ? 'success' : 'info'}>{m.status}</Badge> },
    { key: 'createdAt', header: 'Received', render: (m) => formatDate(m.createdAt) },
  ];

  return (
    <>
      <AdminPageTitle title="Support Inbox" description="Messages submitted through the public contact form." />
      <DataTable columns={cols} rows={messages} empty="No support messages yet. Submit one from the public Contact page." />
    </>
  );
}
