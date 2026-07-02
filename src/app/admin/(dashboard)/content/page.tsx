import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { AdminPageTitle, DataTable, type Column } from '@/components/admin/admin-ui';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/misc';
import { formatDate } from '@/lib/format';
import type { ContentPage } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin · Website Content' };

export default async function AdminContent() {
  const db = getDb();
  const pages = await db.listContentPages();

  const cols: Column<ContentPage>[] = [
    { key: 'title', header: 'Title', render: (p) => <span className="font-medium text-navy">{p.title}</span> },
    { key: 'slug', header: 'Slug', render: (p) => <code className="rounded bg-muted px-1 text-xs">{p.slug}</code> },
    { key: 'published', header: 'Status', render: (p) => <Badge variant={p.published ? 'success' : 'muted'}>{p.published ? 'Published' : 'Draft'}</Badge> },
    { key: 'updatedAt', header: 'Updated', render: (p) => formatDate(p.updatedAt) },
    { key: 'preview', header: 'Preview', render: (p) => <span className="line-clamp-1 max-w-xs text-muted-foreground">{p.body.slice(0, 80)}…</span> },
  ];

  return (
    <>
      <AdminPageTitle title="Website Content (CMS)" description="Manage homepage messaging, company story, mission and other editable copy." />
      <Alert variant="info" className="mb-4">
        <span className="text-xs">
          Content is stored as plain text and rendered through a sanitiser that escapes all HTML — preventing
          script injection by construction. A rich-text editing UI is a documented next step.
        </span>
      </Alert>
      <DataTable columns={cols} rows={pages} empty="No content pages." />
    </>
  );
}
