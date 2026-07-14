import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { AdminPageTitle, DataTable, type Column } from '@/components/admin/admin-ui';
import { CsvButton } from '@/components/admin/csv-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/misc';
import { formatDuration } from '@/lib/format';
import { isPlaceholderRoute, isPublicRoute } from '@/lib/public-data';
import type { Route } from '@/lib/types';
import { DeleteForm } from '@/components/admin/delete-form';
import { deleteRoute, saveRoute } from '../entity-actions';

export const metadata: Metadata = { title: 'Admin - Routes' };

function RouteForm({ route }: { route?: Route }) {
  const suffix = route ? route.id : 'new';
  return (
    <form action={saveRoute} className="grid gap-4 rounded-lg border border-border bg-white p-5 shadow-card lg:grid-cols-6">
      {route && <input type="hidden" name="id" value={route.id} />}
      <Field label="Route code" htmlFor={`code-${suffix}`} required>
        <Input id={`code-${suffix}`} name="code" defaultValue={route?.code ?? ''} required />
      </Field>
      <Field label="Origin" htmlFor={`origin-${suffix}`} required>
        <Input id={`origin-${suffix}`} name="origin" defaultValue={route?.origin ?? ''} required />
      </Field>
      <Field label="Destination" htmlFor={`destination-${suffix}`} required>
        <Input id={`destination-${suffix}`} name="destination" defaultValue={route?.destination ?? ''} required />
      </Field>
      <Field label="Distance (km)" htmlFor={`distance-${suffix}`} required>
        <Input id={`distance-${suffix}`} name="distanceKm" type="number" min={1} defaultValue={route?.distanceKm ?? ''} required />
      </Field>
      <Field label="Duration (mins)" htmlFor={`duration-${suffix}`} required>
        <Input id={`duration-${suffix}`} name="durationMinutes" type="number" min={15} defaultValue={route?.durationMinutes ?? ''} required />
      </Field>
      <Field label="Status" htmlFor={`status-${suffix}`}>
        <Select id={`status-${suffix}`} name="status" defaultValue={route?.status ?? 'draft'}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </Select>
      </Field>
      <div className="lg:col-span-3">
        <Field label="Origin boarding point ID" htmlFor={`origin-bp-${suffix}`} hint="Optional. Leave blank to generate from origin.">
          <Input id={`origin-bp-${suffix}`} name="originBoardingPointId" defaultValue={route?.originBoardingPointId ?? ''} />
        </Field>
      </div>
      <div className="lg:col-span-3">
        <Field label="Destination boarding point ID" htmlFor={`dest-bp-${suffix}`} hint="Optional. Leave blank to generate from destination.">
          <Input id={`dest-bp-${suffix}`} name="destinationBoardingPointId" defaultValue={route?.destinationBoardingPointId ?? ''} />
        </Field>
      </div>
      <div className="lg:col-span-6">
        <Field label="Customer-facing route description" htmlFor={`description-${suffix}`} required>
          <Textarea id={`description-${suffix}`} name="description" defaultValue={route?.description ?? ''} required />
        </Field>
      </div>
      <div className="flex items-center gap-3 lg:col-span-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-navy">
          <input type="checkbox" name="popular" defaultChecked={route?.popular ?? false} className="size-4 accent-gold" />
          Feature on landing page
        </label>
      </div>
      <div className="flex justify-end lg:col-span-2">
        <Button type="submit">{route ? 'Save route' : 'Create route'}</Button>
      </div>
    </form>
  );
}

export default async function AdminRoutes() {
  const db = getDb();
  const routes = (await db.listRoutes()).sort((a, b) => a.origin.localeCompare(b.origin) || a.destination.localeCompare(b.destination));
  const csv = routes.map((r) => ({
    code: r.code,
    origin: r.origin,
    destination: r.destination,
    distanceKm: r.distanceKm,
    durationMinutes: r.durationMinutes,
    status: r.status ?? 'draft',
    popular: r.popular,
  }));

  const cols: Column<Route>[] = [
    { key: 'code', header: 'Code', render: (r) => <Badge variant="outline">{r.code}</Badge> },
    { key: 'origin', header: 'Origin' },
    { key: 'destination', header: 'Destination' },
    { key: 'distanceKm', header: 'Distance', render: (r) => `${r.distanceKm} km` },
    { key: 'duration', header: 'Duration', render: (r) => formatDuration(r.durationMinutes) },
    {
      key: 'status',
      header: 'Visibility',
      render: (r) => (
        <Badge variant={isPublicRoute(r) ? 'success' : r.status === 'archived' ? 'muted' : 'warning'}>
          {isPublicRoute(r) ? 'Public' : r.status === 'archived' ? 'Archived' : 'Draft'}
        </Badge>
      ),
    },
    { key: 'popular', header: 'Landing', render: (r) => (r.popular ? <Badge variant="gold">Featured</Badge> : '-') },
    {
      key: 'quality',
      header: 'Quality',
      render: (r) => (isPlaceholderRoute(r) ? <Badge variant="danger">Sample copy</Badge> : <Badge variant="success">Clean</Badge>),
    },
  ];

  return (
    <>
      <AdminPageTitle
        title="Routes"
        description="Create real routes and activate them when they are ready for customers. Draft/sample routes stay hidden from the public site."
        action={<CsvButton filename="smg-routes" rows={csv} />}
      />

      <div className="mb-6">
        <details className="rounded-lg border border-border bg-white p-4 shadow-card" open={routes.length === 0}>
          <summary className="cursor-pointer font-heading font-bold text-navy">Add route</summary>
          <div className="mt-4">
            <RouteForm />
          </div>
        </details>
      </div>

      <DataTable columns={cols} rows={routes} empty="No routes yet. Add your first route above." />

      <div className="mt-6 space-y-4">
        {routes.map((route) => (
          <details key={route.id} className="rounded-lg border border-border bg-white p-4">
            <summary className="cursor-pointer font-semibold text-navy">
              Edit {route.origin} to {route.destination}
            </summary>
            <div className="mt-4 space-y-3">
              <RouteForm route={route} />
              <div className="flex justify-end">
                <DeleteForm action={deleteRoute} id={route.id} label={`${route.origin} to ${route.destination}`} />
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
