import type { Metadata } from 'next';
import Link from 'next/link';
import { Ticket, CalendarClock, Wallet, Clock, XCircle, Bus, TrendingUp, AlertTriangle } from 'lucide-react';
import { getDb } from '@/lib/db';
import { AdminPageTitle, StatCard, DataTable, type Column } from '@/components/admin/admin-ui';
import { BookingStatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';
import type { Booking } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin · Overview' };

export default function AdminOverview() {
  const db = getDb();
  const o = db.overview();
  const today = new Date().toISOString().slice(0, 10);

  const recent = db.listBookings().slice(0, 8);
  const upcoming = db
    .listSchedules()
    .filter((s) => s.date >= today && s.status === 'scheduled')
    .sort((a, b) => `${a.date}${a.departureTime}`.localeCompare(`${b.date}${b.departureTime}`))
    .slice(0, 8)
    .map((s) => db.getScheduleView(s.id))
    .filter(Boolean);

  const bookingCols: Column<Booking>[] = [
    { key: 'reference', header: 'Ref', render: (b) => <Link href={`/booking/${b.reference}`} className="font-medium text-navy underline">{b.reference}</Link> },
    { key: 'route', header: 'Route', render: (b) => `${b.origin} → ${b.destination}` },
    { key: 'passenger', header: 'Passenger', render: (b) => b.passenger.fullName },
    { key: 'travelDate', header: 'Travel', render: (b) => `${formatDate(b.travelDate)} ${formatTime(b.departureTime)}` },
    { key: 'total', header: 'Total', render: (b) => formatCurrency(b.total) },
    { key: 'status', header: 'Status', render: (b) => <BookingStatusBadge status={b.status} /> },
  ];

  return (
    <>
      <AdminPageTitle title="Overview" description="Live snapshot of bookings, departures and revenue (demo data)." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Total bookings" value={o.totalBookings} icon={Ticket} />
        <StatCard label="Today's bookings" value={o.todaysBookings} icon={CalendarClock} />
        <StatCard label="Upcoming departures" value={o.upcomingDepartures} icon={Bus} />
        <StatCard label="Revenue (confirmed)" value={formatCurrency(o.revenue)} icon={Wallet} />
        <StatCard label="Pending payments" value={o.pendingPayments} icon={Clock} />
        <StatCard label="Cancelled bookings" value={o.cancelledBookings} icon={XCircle} />
        <StatCard label="Seat occupancy" value={`${o.seatOccupancyRate}%`} icon={TrendingUp} />
        <StatCard label="Active buses" value={o.activeBuses} icon={Bus} />
        <StatCard label="Routes needing attention" value={o.routesNeedingAttention} hint="Paused or cancelled trips" icon={AlertTriangle} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-heading text-lg font-bold text-navy">Recent bookings</h2>
        <DataTable columns={bookingCols} rows={recent} empty="No bookings yet." />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-heading text-lg font-bold text-navy">Upcoming departures</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                {['Date', 'Time', 'Route', 'Bus', 'Available seats'].map((h) => (
                  <th key={h} className="px-4 py-3 font-heading text-xs font-bold uppercase tracking-wide text-navy">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcoming.map((v) => (
                <tr key={v!.schedule.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{formatDate(v!.schedule.date)}</td>
                  <td className="px-4 py-3">{formatTime(v!.schedule.departureTime)}</td>
                  <td className="px-4 py-3">{v!.route.origin} → {v!.route.destination}</td>
                  <td className="px-4 py-3">{v!.bus.busNumber} · {v!.bus.category.toUpperCase()}</td>
                  <td className="px-4 py-3">{v!.availableSeats}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
