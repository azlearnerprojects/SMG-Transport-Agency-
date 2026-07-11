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
import type { Promotion, Route } from '@/lib/types';
import { DeleteForm } from '@/components/admin/delete-form';
import { deletePromotion, savePromotion } from '../entity-actions';

export const metadata: Metadata = { title: 'Admin - Promotions' };

function dateInput(value: string) {
  return value ? value.slice(0, 10) : '';
}

function PromoForm({ promo, routes }: { promo?: Promotion; routes: Route[] }) {
  const suffix = promo ? promo.id : 'new';
  const selected = new Set(promo?.routeIds ?? []);
  return (
    <form action={savePromotion} className="grid gap-4 rounded-lg border border-border bg-white p-5 shadow-card lg:grid-cols-6">
      {promo && <input type="hidden" name="id" value={promo.id} />}
      <Field label="Code" htmlFor={`code-${suffix}`} required>
        <Input id={`code-${suffix}`} name="code" defaultValue={promo?.code ?? ''} required />
      </Field>
      <div className="lg:col-span-2">
        <Field label="Title" htmlFor={`title-${suffix}`} required>
          <Input id={`title-${suffix}`} name="title" defaultValue={promo?.title ?? ''} required />
        </Field>
      </div>
      <Field label="Type" htmlFor={`type-${suffix}`}>
        <Select id={`type-${suffix}`} name="type" defaultValue={promo?.type ?? 'percent'}>
          <option value="percent">Percent</option>
          <option value="flat">Flat amount</option>
        </Select>
      </Field>
      <Field label="Value" htmlFor={`value-${suffix}`} required>
        <Input id={`value-${suffix}`} name="value" type="number" min={0} step="0.01" defaultValue={promo?.value ?? ''} required />
      </Field>
      <div className="flex items-end">
        <label className="flex h-11 items-center gap-2 text-sm font-semibold text-navy">
          <input type="checkbox" name="active" defaultChecked={promo?.active ?? false} className="size-4 accent-gold" />
          Active
        </label>
      </div>
      <Field label="Starts" htmlFor={`starts-${suffix}`} required>
        <Input id={`starts-${suffix}`} name="startsAt" type="date" defaultValue={dateInput(promo?.startsAt ?? '')} required />
      </Field>
      <Field label="Ends" htmlFor={`ends-${suffix}`} required>
        <Input id={`ends-${suffix}`} name="endsAt" type="date" defaultValue={dateInput(promo?.endsAt ?? '')} required />
      </Field>
      <div className="lg:col-span-4">
        <Field label="Description" htmlFor={`description-${suffix}`} required>
          <Textarea id={`description-${suffix}`} name="description" defaultValue={promo?.description ?? ''} required />
        </Field>
      </div>
      <div className="lg:col-span-6">
        <Field label="Limit to routes" htmlFor={`routes-${suffix}`} hint="Leave blank to apply to all active routes.">
          <Select id={`routes-${suffix}`} name="routeIds" multiple defaultValue={[...selected]} className="min-h-28 py-2">
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.origin} to {route.destination}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex justify-end lg:col-span-6">
        <Button type="submit">{promo ? 'Save promotion' : 'Create promotion'}</Button>
      </div>
    </form>
  );
}

export default async function AdminPromotions() {
  const db = getDb();
  const [promos, routes] = await Promise.all([db.listPromotions(), db.listRoutes()]);
  const sorted = promos.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const cols: Column<Promotion>[] = [
    { key: 'code', header: 'Code', render: (p) => <span className="font-mono font-semibold text-navy">{p.code}</span> },
    { key: 'title', header: 'Title' },
    { key: 'value', header: 'Discount', render: (p) => (p.type === 'percent' ? `${p.value}%` : `GHS ${p.value}`) },
    { key: 'window', header: 'Valid', render: (p) => `${formatDate(p.startsAt)} - ${formatDate(p.endsAt)}` },
    { key: 'routes', header: 'Scope', render: (p) => (p.routeIds?.length ? `${p.routeIds.length} route(s)` : 'All routes') },
    { key: 'active', header: 'Status', render: (p) => <Badge variant={p.active ? 'success' : 'muted'}>{p.active ? 'Active' : 'Inactive'}</Badge> },
  ];

  return (
    <>
      <AdminPageTitle title="Promotions" description="Create and update discount codes used at checkout and on the public promotions page." />

      <div className="mb-6">
        <details className="rounded-lg border border-border bg-white p-4 shadow-card" open={promos.length === 0}>
          <summary className="cursor-pointer font-heading font-bold text-navy">Add promotion</summary>
          <div className="mt-4">
            <PromoForm routes={routes.filter((route) => route.status !== 'archived')} />
          </div>
        </details>
      </div>

      <DataTable columns={cols} rows={sorted} empty="No promotions yet. Add your first promotion above." />

      <div className="mt-6 space-y-4">
        {sorted.map((promo) => (
          <details key={promo.id} className="rounded-lg border border-border bg-white p-4">
            <summary className="cursor-pointer font-semibold text-navy">Edit {promo.code}</summary>
            <div className="mt-4 space-y-3">
              <PromoForm promo={promo} routes={routes.filter((route) => route.status !== 'archived')} />
              <div className="flex justify-end">
                <DeleteForm action={deletePromotion} id={promo.id} label={promo.code} />
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
