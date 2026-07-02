import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { AdminPageTitle, DataTable, type Column } from '@/components/admin/admin-ui';
import { CsvButton } from '@/components/admin/csv-button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';

type Row = {
  id: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  route: string;
  bus: string;
  fares: string;
  available: number;
  status: string;
};

export const metadata: Metadata = { title: 'Admin · Schedules' };

export default async function AdminSchedules() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = (await db.listSchedules())
    .filter((s) => s.date >= today)
    .sort((a, b) => `${a.date}${a.departureTime}`.localeCompare(`${b.date}${b.departureTime}`))
    .slice(0, 80);
  const views = await Promise.all(upcoming.map((s) => db.getScheduleView(s.id)));
  const rows: Row[] = upcoming.map((s, index) => {
    const v = views[index];
    return {
      id: s.id,
      date: s.date,
      departureTime: s.departureTime,
      arrivalTime: s.arrivalTime,
      route: v ? `${v.route.origin} → ${v.route.destination}` : s.routeId,
      bus: v ? `${v.bus.busNumber} (${v.bus.category})` : s.busId,
      fares: `${formatCurrency(s.fares.standard)} / ${formatCurrency(s.fares.business)} / ${formatCurrency(s.fares.vip)}`,
      available: v?.availableSeats ?? 0,
      status: s.status,
    };
  });

  const cols: Column<Row>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'departureTime', header: 'Depart', render: (r) => formatTime(r.departureTime) },
    { key: 'arrivalTime', header: 'Arrive', render: (r) => formatTime(r.arrivalTime) },
    { key: 'route', header: 'Route' },
    { key: 'bus', header: 'Bus' },
    { key: 'fares', header: 'Fares (Std/Bus/VIP)' },
    { key: 'available', header: 'Avail' },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'scheduled' ? 'success' : 'warning'}>{r.status}</Badge> },
  ];

  return (
    <>
      <AdminPageTitle title="Schedules" description="Upcoming departures with assigned buses and fares. Pause/cancel and assignment wired to the data layer." action={<CsvButton filename="smg-schedules" rows={rows} />} />
      <DataTable columns={cols} rows={rows} empty="No upcoming schedules." />
    </>
  );
}
