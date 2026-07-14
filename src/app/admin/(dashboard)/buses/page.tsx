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
import type { Bus, SeatLayout } from '@/lib/types';
import { DeleteForm } from '@/components/admin/delete-form';
import { deleteBus, saveBus } from '../entity-actions';

export const metadata: Metadata = { title: 'Admin - Buses' };

function BusForm({ bus, layouts }: { bus?: Bus; layouts: SeatLayout[] }) {
  const suffix = bus ? bus.id : 'new';
  return (
    <form action={saveBus} className="grid gap-4 rounded-lg border border-border bg-white p-5 shadow-card lg:grid-cols-6">
      {bus && <input type="hidden" name="id" value={bus.id} />}
      <Field label="Bus number" htmlFor={`busNumber-${suffix}`} required>
        <Input id={`busNumber-${suffix}`} name="busNumber" defaultValue={bus?.busNumber ?? ''} required />
      </Field>
      <div className="lg:col-span-2">
        <Field label="Display name" htmlFor={`name-${suffix}`} required>
          <Input id={`name-${suffix}`} name="name" defaultValue={bus?.name ?? ''} required />
        </Field>
      </div>
      <Field label="Class" htmlFor={`category-${suffix}`}>
        <Select id={`category-${suffix}`} name="category" defaultValue={bus?.category ?? 'standard'}>
          <option value="standard">Standard</option>
          <option value="business">Business</option>
          <option value="vip">VIP</option>
        </Select>
      </Field>
      <Field label="Seat layout" htmlFor={`layout-${suffix}`}>
        <Select id={`layout-${suffix}`} name="seatLayoutId" defaultValue={bus?.seatLayoutId ?? layouts[0]?.id ?? ''} required>
          {layouts.map((layout) => (
            <option key={layout.id} value={layout.id}>
              {layout.name} ({layout.capacity})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Status" htmlFor={`status-${suffix}`}>
        <Select id={`status-${suffix}`} name="status" defaultValue={bus?.status ?? 'active'}>
          <option value="active">Active</option>
          <option value="maintenance">Maintenance</option>
          <option value="archived">Archived</option>
        </Select>
      </Field>
      <div className="lg:col-span-3">
        <Field label="Amenities" htmlFor={`amenities-${suffix}`} hint="One per line or comma-separated.">
          <Textarea id={`amenities-${suffix}`} name="amenities" defaultValue={bus?.amenities.join('\n') ?? ''} />
        </Field>
      </div>
      <div className="lg:col-span-3">
        <Field label="Blocked / out-of-service seats" htmlFor={`blocked-${suffix}`} hint="Seat IDs, one per line or comma-separated.">
          <Textarea id={`blocked-${suffix}`} name="blockedSeatIds" defaultValue={bus?.blockedSeatIds.join('\n') ?? ''} />
        </Field>
      </div>
      <div className="flex justify-end lg:col-span-6">
        <Button type="submit">{bus ? 'Save bus' : 'Create bus'}</Button>
      </div>
    </form>
  );
}

export default async function AdminBuses() {
  const db = getDb();
  const [buses, layouts] = await Promise.all([db.listBuses(), db.listLayouts()]);
  const sorted = buses.sort((a, b) => a.busNumber.localeCompare(b.busNumber));
  const csv = sorted.map((b) => ({
    busNumber: b.busNumber,
    name: b.name,
    category: b.category,
    capacity: b.capacity,
    status: b.status,
    amenities: b.amenities.join(' | '),
  }));

  const cols: Column<Bus>[] = [
    { key: 'busNumber', header: 'Bus No.', render: (b) => <span className="font-medium text-navy">{b.busNumber}</span> },
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Class', render: (b) => <Badge variant={b.category === 'vip' ? 'gold' : b.category === 'business' ? 'navy' : 'muted'}>{b.category.toUpperCase()}</Badge> },
    { key: 'capacity', header: 'Seats' },
    { key: 'blocked', header: 'Out of service', render: (b) => (b.blockedSeatIds.length ? b.blockedSeatIds.join(', ') : '-') },
    { key: 'status', header: 'Status', render: (b) => <Badge variant={b.status === 'active' ? 'success' : b.status === 'maintenance' ? 'warning' : 'muted'}>{b.status}</Badge> },
  ];

  return (
    <>
      <AdminPageTitle
        title="Buses / Fleet"
        description="Create and maintain fleet records used by schedules and the public fleet page."
        action={<CsvButton filename="smg-buses" rows={csv} />}
      />

      <div className="mb-6">
        <details className="rounded-lg border border-border bg-white p-4 shadow-card" open={buses.length === 0}>
          <summary className="cursor-pointer font-heading font-bold text-navy">Add bus</summary>
          <div className="mt-4">
            <BusForm layouts={layouts} />
          </div>
        </details>
      </div>

      <DataTable columns={cols} rows={sorted} empty="No buses yet. Add your first bus above." />

      <div className="mt-6 space-y-4">
        {sorted.map((bus) => (
          <details key={bus.id} className="rounded-lg border border-border bg-white p-4">
            <summary className="cursor-pointer font-semibold text-navy">Edit {bus.busNumber}</summary>
            <div className="mt-4 space-y-3">
              <BusForm bus={bus} layouts={layouts} />
              <div className="flex justify-end">
                <DeleteForm action={deleteBus} id={bus.id} label={bus.busNumber} />
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
