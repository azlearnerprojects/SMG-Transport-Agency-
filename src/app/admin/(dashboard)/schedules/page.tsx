import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { AdminPageTitle, DataTable, type Column } from '@/components/admin/admin-ui';
import { CsvButton } from '@/components/admin/csv-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/misc';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';
import type { Bus, Route, Schedule } from '@/lib/types';
import { DeleteForm } from '@/components/admin/delete-form';
import { deleteSchedule, saveSchedule } from '../entity-actions';

type Row = {
  id: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  route: string;
  bus: string;
  fares: string;
  booked: number;
  available: number;
  status: string;
};

export const metadata: Metadata = { title: 'Admin - Schedules' };

function ScheduleForm({ schedule, routes, buses }: { schedule?: Schedule; routes: Route[]; buses: Bus[] }) {
  const suffix = schedule ? schedule.id : 'new';
  return (
    <form action={saveSchedule} className="grid gap-4 rounded-lg border border-border bg-white p-5 shadow-card lg:grid-cols-8">
      {schedule && <input type="hidden" name="id" value={schedule.id} />}
      <div className="lg:col-span-3">
        <Field label="Route" htmlFor={`route-${suffix}`} required>
          <Select id={`route-${suffix}`} name="routeId" defaultValue={schedule?.routeId ?? routes[0]?.id ?? ''} required>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.origin} to {route.destination} ({route.status ?? 'draft'})
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="lg:col-span-3">
        <Field label="Bus" htmlFor={`bus-${suffix}`} required>
          <Select id={`bus-${suffix}`} name="busId" defaultValue={schedule?.busId ?? buses[0]?.id ?? ''} required>
            {buses.map((bus) => (
              <option key={bus.id} value={bus.id}>
                {bus.busNumber} - {bus.name} ({bus.status})
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Date" htmlFor={`date-${suffix}`} required>
        <Input id={`date-${suffix}`} name="date" type="date" defaultValue={schedule?.date ?? ''} required />
      </Field>
      <Field label="Status" htmlFor={`status-${suffix}`}>
        <Select id={`status-${suffix}`} name="status" defaultValue={schedule?.status ?? 'scheduled'}>
          <option value="scheduled">Scheduled</option>
          <option value="paused">Paused</option>
          <option value="cancelled">Cancelled</option>
          <option value="departed">Departed</option>
          <option value="completed">Completed</option>
        </Select>
      </Field>
      <Field label="Depart" htmlFor={`depart-${suffix}`} required>
        <Input id={`depart-${suffix}`} name="departureTime" type="time" defaultValue={schedule?.departureTime ?? ''} required />
      </Field>
      <Field label="Arrive" htmlFor={`arrive-${suffix}`} required>
        <Input id={`arrive-${suffix}`} name="arrivalTime" type="time" defaultValue={schedule?.arrivalTime ?? ''} required />
      </Field>
      <Field label="Standard fare" htmlFor={`std-${suffix}`} required>
        <Input id={`std-${suffix}`} name="standardFare" type="number" min={0} step="0.01" defaultValue={schedule?.fares.standard ?? ''} required />
      </Field>
      <Field label="Business fare" htmlFor={`busFare-${suffix}`} required>
        <Input id={`busFare-${suffix}`} name="businessFare" type="number" min={0} step="0.01" defaultValue={schedule?.fares.business ?? ''} required />
      </Field>
      <Field label="VIP fare" htmlFor={`vip-${suffix}`} required>
        <Input id={`vip-${suffix}`} name="vipFare" type="number" min={0} step="0.01" defaultValue={schedule?.fares.vip ?? ''} required />
      </Field>
      <Field label="Service fee" htmlFor={`fee-${suffix}`} required>
        <Input id={`fee-${suffix}`} name="serviceFee" type="number" min={0} step="0.01" defaultValue={schedule?.serviceFee ?? 0} required />
      </Field>
      <div className="flex justify-end lg:col-span-2 lg:items-end">
        <Button type="submit">{schedule ? 'Save schedule' : 'Create schedule'}</Button>
      </div>
    </form>
  );
}

export default async function AdminSchedules() {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const [schedules, routes, buses, layouts] = await Promise.all([
    db.listSchedules(),
    db.listRoutes(),
    db.listBuses(),
    db.listLayouts(),
  ]);
  const routeById = new Map(routes.map((route) => [route.id, route]));
  const busById = new Map(buses.map((bus) => [bus.id, bus]));
  const layoutById = new Map(layouts.map((layout) => [layout.id, layout]));
  const sorted = schedules
    .sort((a, b) => `${a.date}${a.departureTime}`.localeCompare(`${b.date}${b.departureTime}`))
    .slice(0, 120);

  const rows: Row[] = sorted.map((schedule) => {
    const route = routeById.get(schedule.routeId);
    const bus = busById.get(schedule.busId);
    const layout = bus ? layoutById.get(bus.seatLayoutId) : undefined;
    const blocked = bus?.blockedSeatIds.length ?? 0;
    const available = Math.max(0, (layout?.capacity ?? 0) - schedule.bookedSeatIds.length - blocked);
    return {
      id: schedule.id,
      date: schedule.date,
      departureTime: schedule.departureTime,
      arrivalTime: schedule.arrivalTime,
      route: route ? `${route.origin} to ${route.destination}` : schedule.routeId,
      bus: bus ? `${bus.busNumber} (${bus.category})` : schedule.busId,
      fares: `${formatCurrency(schedule.fares.standard)} / ${formatCurrency(schedule.fares.business)} / ${formatCurrency(schedule.fares.vip)}`,
      booked: schedule.bookedSeatIds.length,
      available,
      status: schedule.status,
    };
  });

  const cols: Column<Row>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'departureTime', header: 'Depart', render: (r) => formatTime(r.departureTime) },
    { key: 'arrivalTime', header: 'Arrive', render: (r) => formatTime(r.arrivalTime) },
    { key: 'route', header: 'Route' },
    { key: 'bus', header: 'Bus' },
    { key: 'fares', header: 'Fares' },
    { key: 'booked', header: 'Booked' },
    { key: 'available', header: 'Avail' },
    { key: 'status', header: 'Status', render: (r) => <Badge variant={r.status === 'scheduled' ? 'success' : r.status === 'cancelled' ? 'danger' : 'warning'}>{r.status}</Badge> },
  ];

  return (
    <>
      <AdminPageTitle
        title="Schedules"
        description="Create departures, assign buses, and control customer-visible availability."
        action={<CsvButton filename="smg-schedules" rows={rows} />}
      />

      <div className="mb-6">
        <details className="rounded-lg border border-border bg-white p-4 shadow-card" open={schedules.length === 0}>
          <summary className="cursor-pointer font-heading font-bold text-navy">Add departure</summary>
          <div className="mt-4">
            <ScheduleForm routes={routes.filter((route) => route.status !== 'archived')} buses={buses.filter((bus) => bus.status !== 'archived')} />
          </div>
        </details>
      </div>

      <DataTable columns={cols} rows={rows} empty="No schedules yet. Add your first departure above." />

      <div className="mt-6 space-y-4">
        {sorted
          .filter((schedule) => schedule.date >= today)
          .slice(0, 40)
          .map((schedule) => (
            <details key={schedule.id} className="rounded-lg border border-border bg-white p-4">
              <summary className="cursor-pointer font-semibold text-navy">
                Edit {rows.find((row) => row.id === schedule.id)?.route ?? schedule.routeId} on {formatDate(schedule.date)} at {formatTime(schedule.departureTime)}
              </summary>
              <div className="mt-4 space-y-3">
                <ScheduleForm schedule={schedule} routes={routes.filter((route) => route.status !== 'archived')} buses={buses.filter((bus) => bus.status !== 'archived')} />
                <div className="flex justify-end">
                  <DeleteForm
                    action={deleteSchedule}
                    id={schedule.id}
                    label={`${rows.find((row) => row.id === schedule.id)?.route ?? schedule.routeId} on ${formatDate(schedule.date)}`}
                  />
                </div>
              </div>
            </details>
          ))}
      </div>
    </>
  );
}
