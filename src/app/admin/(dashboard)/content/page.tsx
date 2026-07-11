import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { AdminPageTitle, DataTable, type Column } from '@/components/admin/admin-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, Alert } from '@/components/ui/misc';
import { formatDate } from '@/lib/format';
import type { ContentPage } from '@/lib/types';
import { DeleteForm } from '@/components/admin/delete-form';
import { deleteContentPage, saveContentPage } from '../entity-actions';

export const metadata: Metadata = { title: 'Admin - Website Content' };

function ContentForm({ page }: { page?: ContentPage }) {
  const suffix = page ? page.id : 'new';
  return (
    <form action={saveContentPage} className="grid gap-4 rounded-lg border border-border bg-white p-5 shadow-card lg:grid-cols-4">
      {page && <input type="hidden" name="id" value={page.id} />}
      <Field label="Slug" htmlFor={`slug-${suffix}`} required hint="Lowercase letters, numbers, and hyphens only.">
        <Input id={`slug-${suffix}`} name="slug" defaultValue={page?.slug ?? ''} required />
      </Field>
      <div className="lg:col-span-3">
        <Field label="Title" htmlFor={`title-${suffix}`} required>
          <Input id={`title-${suffix}`} name="title" defaultValue={page?.title ?? ''} required />
        </Field>
      </div>
      <div className="lg:col-span-4">
        <Field label="Body" htmlFor={`body-${suffix}`} required>
          <Textarea id={`body-${suffix}`} name="body" defaultValue={page?.body ?? ''} className="min-h-44" required />
        </Field>
      </div>
      <div className="flex items-center gap-3 lg:col-span-2">
        <label className="flex items-center gap-2 text-sm font-semibold text-navy">
          <input type="checkbox" name="published" defaultChecked={page?.published ?? false} className="size-4 accent-gold" />
          Published
        </label>
      </div>
      <div className="flex justify-end lg:col-span-2">
        <Button type="submit">{page ? 'Save page' : 'Create page'}</Button>
      </div>
    </form>
  );
}

export default async function AdminContent() {
  const db = getDb();
  const pages = (await db.listContentPages()).sort((a, b) => a.slug.localeCompare(b.slug));

  const cols: Column<ContentPage>[] = [
    { key: 'title', header: 'Title', render: (p) => <span className="font-medium text-navy">{p.title}</span> },
    { key: 'slug', header: 'Slug', render: (p) => <code className="rounded bg-muted px-1 text-xs">{p.slug}</code> },
    { key: 'published', header: 'Status', render: (p) => <Badge variant={p.published ? 'success' : 'muted'}>{p.published ? 'Published' : 'Draft'}</Badge> },
    { key: 'updatedAt', header: 'Updated', render: (p) => formatDate(p.updatedAt) },
    { key: 'preview', header: 'Preview', render: (p) => <span className="line-clamp-1 max-w-xs text-muted-foreground">{p.body.slice(0, 80)}</span> },
  ];

  return (
    <>
      <AdminPageTitle title="Website Content" description="Create and edit text pages used by the customer-facing site." />
      <Alert variant="info" className="mb-4">
        Content is stored as plain text and escaped before rendering. Use short paragraphs for the best customer experience.
      </Alert>

      <div className="mb-6">
        <details className="rounded-lg border border-border bg-white p-4 shadow-card" open={pages.length === 0}>
          <summary className="cursor-pointer font-heading font-bold text-navy">Add content page</summary>
          <div className="mt-4">
            <ContentForm />
          </div>
        </details>
      </div>

      <DataTable columns={cols} rows={pages} empty="No content pages yet. Add your first page above." />

      <div className="mt-6 space-y-4">
        {pages.map((page) => (
          <details key={page.id} className="rounded-lg border border-border bg-white p-4">
            <summary className="cursor-pointer font-semibold text-navy">Edit /{page.slug}</summary>
            <div className="mt-4 space-y-3">
              <ContentForm page={page} />
              <div className="flex justify-end">
                <DeleteForm action={deleteContentPage} id={page.id} label={`/${page.slug}`} />
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
