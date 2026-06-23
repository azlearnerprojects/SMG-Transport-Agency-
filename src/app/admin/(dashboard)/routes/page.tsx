import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { AdminPageTitle, DataTable, type Column } from '@/components/admin/admin-ui';
import { CsvButton } from '@/components/admin/csv-button';
import { Badge } from '@/components/ui/badge';
import { formatDuration } from '@/lib/format';
import type { Route } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin · Routes' };

export default function AdminRoutes() {
  const db = getDb();
  const routes = db.listRoutes();
  const csv = routes.map((r) => ({ code: r.code, origin: r.origin, destination: r.destination, distanceKm: r.distanceKm, durationMinutes: r.durationMinutes, popular: r.popular }));

  const cols: Column<Route>[] = [
    { key: 'code', header: 'Code', render: (r) => <Badge variant="outline">{r.code}</Badge> },
    { key: 'origin', header: 'Origin' },
    { key: 'destination', header: 'Destination' },
    { key: 'distanceKm', header: 'Distance', render: (r) => `${r.distanceKm} km` },
    { key: 'duration', header: 'Duration', render: (r) => formatDuration(r.durationMinutes) },
    { key: 'popular', header: 'Popular', render: (r) => (r.popular ? <Badge variant="gold">Popular</Badge> : '—') },
  ];

  return (
    <>
      <AdminPageTitle title="Routes" description="Boarding points, destinations and journey times. (Sample routes pending CEO approval.)" action={<CsvButton filename="smg-routes" rows={csv} />} />
      <DataTable columns={cols} rows={routes} empty="No routes." />
    </>
  );
}
