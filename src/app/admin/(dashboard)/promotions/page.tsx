import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { AdminPageTitle, DataTable, type Column } from '@/components/admin/admin-ui';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';
import type { Promotion } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin · Promotions' };

export default function AdminPromotions() {
  const db = getDb();
  const promos = db.listPromotions();

  const cols: Column<Promotion>[] = [
    { key: 'code', header: 'Code', render: (p) => <span className="font-mono font-semibold text-navy">{p.code}</span> },
    { key: 'title', header: 'Title' },
    { key: 'value', header: 'Discount', render: (p) => (p.type === 'percent' ? `${p.value}%` : `GH₵${p.value}`) },
    { key: 'window', header: 'Valid', render: (p) => `${formatDate(p.startsAt)} – ${formatDate(p.endsAt)}` },
    { key: 'active', header: 'Status', render: (p) => <Badge variant={p.active ? 'success' : 'muted'}>{p.active ? 'Active' : 'Inactive'}</Badge> },
  ];

  return (
    <>
      <AdminPageTitle title="Promotions" description="Discount codes and promotional fares applied at checkout." />
      <DataTable columns={cols} rows={promos} empty="No promotions." />
    </>
  );
}
