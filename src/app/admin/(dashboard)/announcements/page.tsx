import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { AdminPageTitle, DataTable, type Column } from '@/components/admin/admin-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/misc';
import { formatDate } from '@/lib/format';
import type { Announcement } from '@/lib/types';
import { DeleteForm } from '@/components/admin/delete-form';
import { deleteAnnouncement, saveAnnouncement } from '../entity-actions';

export const metadata: Metadata = { title: 'Admin - Announcements' };

function dateInput(value: string) {
  return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function AnnouncementForm({ announcement }: { announcement?: Announcement }) {
  const suffix = announcement ? announcement.id : 'new';
  return (
    <form action={saveAnnouncement} className="grid gap-4 rounded-lg border border-border bg-white p-5 shadow-card lg:grid-cols-6">
      {announcement && <input type="hidden" name="id" value={announcement.id} />}
      <div className="lg:col-span-3">
        <Field label="Title" htmlFor={`title-${suffix}`} required>
          <Input id={`title-${suffix}`} name="title" defaultValue={announcement?.title ?? ''} required />
        </Field>
      </div>
      <Field label="Level" htmlFor={`level-${suffix}`}>
        <Select id={`level-${suffix}`} name="level" defaultValue={announcement?.level ?? 'info'}>
          <option value="info">Info</option>
          <option value="success">Success</option>
          <option value="warning">Warning</option>
        </Select>
      </Field>
      <Field label="Publish date" htmlFor={`published-${suffix}`} required>
        <Input id={`published-${suffix}`} name="publishedAt" type="date" defaultValue={dateInput(announcement?.publishedAt ?? '')} required />
      </Field>
      <div className="flex items-end">
        <label className="flex h-11 items-center gap-2 text-sm font-semibold text-navy">
          <input type="checkbox" name="active" defaultChecked={announcement?.active ?? false} className="size-4 accent-gold" />
          Active
        </label>
      </div>
      <div className="lg:col-span-6">
        <Field label="Message" htmlFor={`body-${suffix}`} required>
          <Textarea id={`body-${suffix}`} name="body" defaultValue={announcement?.body ?? ''} required />
        </Field>
      </div>
      <div className="flex justify-end lg:col-span-6">
        <Button type="submit">{announcement ? 'Save announcement' : 'Create announcement'}</Button>
      </div>
    </form>
  );
}

export default async function AdminAnnouncements() {
  const db = getDb();
  const items = (await db.listAllAnnouncements()).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const cols: Column<Announcement>[] = [
    { key: 'title', header: 'Title', render: (a) => <span className="font-medium text-navy">{a.title}</span> },
    { key: 'level', header: 'Level', render: (a) => <Badge variant={a.level === 'success' ? 'success' : a.level === 'warning' ? 'warning' : 'info'}>{a.level}</Badge> },
    { key: 'body', header: 'Message', render: (a) => <span className="line-clamp-1 max-w-md text-muted-foreground">{a.body}</span> },
    { key: 'publishedAt', header: 'Published', render: (a) => formatDate(a.publishedAt) },
    { key: 'active', header: 'Status', render: (a) => <Badge variant={a.active ? 'success' : 'muted'}>{a.active ? 'Active' : 'Hidden'}</Badge> },
  ];

  return (
    <>
      <AdminPageTitle title="Announcements" description="Publish, hide, and update customer-facing notices." />

      <div className="mb-6">
        <details className="rounded-lg border border-border bg-white p-4 shadow-card" open={items.length === 0}>
          <summary className="cursor-pointer font-heading font-bold text-navy">Add announcement</summary>
          <div className="mt-4">
            <AnnouncementForm />
          </div>
        </details>
      </div>

      <DataTable columns={cols} rows={items} empty="No announcements yet. Add your first notice above." />

      <div className="mt-6 space-y-4">
        {items.map((announcement) => (
          <details key={announcement.id} className="rounded-lg border border-border bg-white p-4">
            <summary className="cursor-pointer font-semibold text-navy">Edit: {announcement.title}</summary>
            <div className="mt-4 space-y-3">
              <AnnouncementForm announcement={announcement} />
              <div className="flex justify-end">
                <DeleteForm action={deleteAnnouncement} id={announcement.id} label={announcement.title} />
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
