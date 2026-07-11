import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { AdminPageTitle, DataTable, type Column } from '@/components/admin/admin-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/misc';
import type { FaqItem } from '@/lib/types';
import { DeleteForm } from '@/components/admin/delete-form';
import { deleteFaq, saveFaq } from '../entity-actions';

export const metadata: Metadata = { title: 'Admin - FAQs' };

function FaqForm({ faq }: { faq?: FaqItem }) {
  const suffix = faq ? faq.id : 'new';
  return (
    <form action={saveFaq} className="grid gap-4 rounded-lg border border-border bg-white p-5 shadow-card lg:grid-cols-6">
      {faq && <input type="hidden" name="id" value={faq.id} />}
      <div className="lg:col-span-4">
        <Field label="Question" htmlFor={`question-${suffix}`} required>
          <Input id={`question-${suffix}`} name="question" defaultValue={faq?.question ?? ''} required />
        </Field>
      </div>
      <Field label="Category" htmlFor={`category-${suffix}`} required>
        <Input id={`category-${suffix}`} name="category" defaultValue={faq?.category ?? ''} required />
      </Field>
      <Field label="Order" htmlFor={`order-${suffix}`} required>
        <Input id={`order-${suffix}`} name="order" type="number" min={0} defaultValue={faq?.order ?? 0} required />
      </Field>
      <div className="lg:col-span-6">
        <Field label="Answer" htmlFor={`answer-${suffix}`} required>
          <Textarea id={`answer-${suffix}`} name="answer" defaultValue={faq?.answer ?? ''} required />
        </Field>
      </div>
      <div className="flex items-center gap-3 lg:col-span-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-navy">
          <input type="checkbox" name="published" defaultChecked={faq?.published ?? false} className="size-4 accent-gold" />
          Published on public FAQ
        </label>
      </div>
      <div className="flex justify-end lg:col-span-2">
        <Button type="submit">{faq ? 'Save FAQ' : 'Create FAQ'}</Button>
      </div>
    </form>
  );
}

export default async function AdminFaqs() {
  const db = getDb();
  const faqs = (await db.listAllFaqs()).sort((a, b) => a.order - b.order);

  const cols: Column<FaqItem>[] = [
    { key: 'order', header: '#', className: 'w-12' },
    { key: 'question', header: 'Question', render: (f) => <span className="font-medium text-navy">{f.question}</span> },
    { key: 'category', header: 'Category', render: (f) => <Badge variant="muted">{f.category}</Badge> },
    { key: 'published', header: 'Status', render: (f) => <Badge variant={f.published ? 'success' : 'muted'}>{f.published ? 'Published' : 'Hidden'}</Badge> },
  ];

  return (
    <>
      <AdminPageTitle title="FAQs" description="Create, reorder, publish, or hide questions shown on the public FAQ page and homepage." />

      <div className="mb-6">
        <details className="rounded-lg border border-border bg-white p-4 shadow-card" open={faqs.length === 0}>
          <summary className="cursor-pointer font-heading font-bold text-navy">Add FAQ</summary>
          <div className="mt-4">
            <FaqForm />
          </div>
        </details>
      </div>

      <DataTable columns={cols} rows={faqs} empty="No FAQs yet. Add your first FAQ above." />

      <div className="mt-6 space-y-4">
        {faqs.map((faq) => (
          <details key={faq.id} className="rounded-lg border border-border bg-white p-4">
            <summary className="cursor-pointer font-semibold text-navy">Edit: {faq.question}</summary>
            <div className="mt-4 space-y-3">
              <FaqForm faq={faq} />
              <div className="flex justify-end">
                <DeleteForm action={deleteFaq} id={faq.id} label={faq.question} />
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
