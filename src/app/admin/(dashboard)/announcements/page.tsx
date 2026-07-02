import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { AdminPageTitle, DataTable, type Column } from '@/components/admin/admin-ui';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import type { Announcement } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin · Announcements' };

export default async function AdminAnnouncements() {
  const db = getDb();
  const items = await db.listAnnouncements();

  const cols: Column<Announcement>[] = [
    { key: 'title', header: 'Title', render: (a) => <span className="font-medium text-navy">{a.title}</span> },
    { key: 'level', header: 'Level', render: (a) => <Badge variant={a.level === 'success' ? 'success' : a.level === 'warning' ? 'warning' : 'info'}>{a.level}</Badge> },
    { key: 'body', header: 'Message', render: (a) => <span className="line-clamp-1 max-w-md text-muted-foreground">{a.body}</span> },
    { key: 'publishedAt', header: 'Published', render: (a) => formatDate(a.publishedAt) },
  ];

  return (
    <>
      <AdminPageTitle title="Announcements" description="Publish notices shown to customers (e.g. holiday schedules)." />
      <DataTable columns={cols} rows={items} empty="No announcements." />
    </>
  );
}
