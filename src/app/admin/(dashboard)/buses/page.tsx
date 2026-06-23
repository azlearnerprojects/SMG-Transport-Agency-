import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { AdminPageTitle, DataTable, type Column } from '@/components/admin/admin-ui';
import { CsvButton } from '@/components/admin/csv-button';
import { Badge } from '@/components/ui/badge';
import type { Bus } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin · Buses' };

export default function AdminBuses() {
  const db = getDb();
  const buses = db.listBuses();
  const csv = buses.map((b) => ({ busNumber: b.busNumber, name: b.name, category: b.category, capacity: b.capacity, status: b.status, amenities: b.amenities.join(' | ') }));

  const cols: Column<Bus>[] = [
    { key: 'busNumber', header: 'Bus No.', render: (b) => <span className="font-medium text-navy">{b.busNumber}</span> },
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Class', render: (b) => <Badge variant={b.category === 'vip' ? 'gold' : b.category === 'business' ? 'navy' : 'muted'}>{b.category.toUpperCase()}</Badge> },
    { key: 'capacity', header: 'Seats' },
    { key: 'blocked', header: 'Out of service', render: (b) => (b.blockedSeatIds.length ? b.blockedSeatIds.join(', ') : '—') },
    { key: 'status', header: 'Status', render: (b) => <Badge variant={b.status === 'active' ? 'success' : b.status === 'maintenance' ? 'warning' : 'muted'}>{b.status}</Badge> },
  ];

  return (
    <>
      <AdminPageTitle
        title="Buses"
        description="Fleet inventory. Add, edit, archive buses and mark seats out of service (wired to the data layer; full CRUD UI is a documented next step)."
        action={<CsvButton filename="smg-buses" rows={csv} />}
      />
      <DataTable columns={cols} rows={buses} empty="No buses." />
    </>
  );
}
