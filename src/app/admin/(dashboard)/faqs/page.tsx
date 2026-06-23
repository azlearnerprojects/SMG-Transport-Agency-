import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { AdminPageTitle, DataTable, type Column } from '@/components/admin/admin-ui';
import { Badge } from '@/components/ui/badge';
import type { FaqItem } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin · FAQs' };

export default function AdminFaqs() {
  const db = getDb();
  const faqs = db.listAllFaqs().sort((a, b) => a.order - b.order);

  const cols: Column<FaqItem>[] = [
    { key: 'order', header: '#', className: 'w-12' },
    { key: 'question', header: 'Question', render: (f) => <span className="font-medium text-navy">{f.question}</span> },
    { key: 'category', header: 'Category', render: (f) => <Badge variant="muted">{f.category}</Badge> },
    { key: 'published', header: 'Status', render: (f) => <Badge variant={f.published ? 'success' : 'muted'}>{f.published ? 'Published' : 'Hidden'}</Badge> },
  ];

  return (
    <>
      <AdminPageTitle title="FAQs" description="Manage frequently asked questions shown on the public FAQ page." />
      <DataTable columns={cols} rows={faqs} empty="No FAQs." />
    </>
  );
}
