import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
  ArrowUpRight,
  Bus,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  MapPinned,
  Megaphone,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  ShieldCheck,
  MessageCircle,
  TriangleAlert,
  Ticket,
  Users,
} from 'lucide-react';
import { getStaffSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { countChatSessions } from '@/lib/chatbot/admin';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';
import { BookingStatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import type { Booking, BookingStatus } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin - Dashboard' };

const QUICK_ACTIONS = [
  { label: 'Add route', href: '/admin/routes', icon: RouteIcon },
  { label: 'Add bus', href: '/admin/buses', icon: Bus },
  { label: 'Create schedule', href: '/admin/schedules', icon: CalendarClock },
  { label: 'View bookings', href: '/admin/bookings', icon: Ticket },
  { label: 'Manage users', href: '/admin/users', icon: Users },
  { label: 'View reports', href: '/admin/reports', icon: Activity },
];

function countByStatus(bookings: Booking[]) {
  return bookings.reduce<Record<string, number>>((acc, booking) => {
    acc[booking.status] = (acc[booking.status] ?? 0) + 1;
    return acc;
  }, {});
}

export default async function AdminOverview() {
  const session = await getStaffSession();
  const db = getDb();
  const overview = db.overview();
  const bookings = db.listBookings();
  const routes = db.listRoutes();
  const buses = db.listBuses();
  const schedules = db.listSchedules();
  const payments = db.listPayments();
  const chatSessions = await countChatSessions();
  const today = new Date().toISOString().slice(0, 10);

  const pendingChanges = bookings.filter((booking) =>
    ['cancel_requested', 'reschedule_requested'].includes(booking.status),
  ).length;
  const pendingCancellations = bookings.filter((booking) => booking.status === 'cancel_requested').length;
  const pendingReschedules = bookings.filter((booking) => booking.status === 'reschedule_requested').length;
  const failedPayments = payments.filter((payment) => payment.status === 'failed').length;
  const availableBuses = buses.filter((bus) => bus.status === 'active').length;
  const todayDepartures = schedules.filter((schedule) => schedule.date === today && schedule.status === 'scheduled').length;
  const statusCounts = countByStatus(bookings);
  const statusItems: BookingStatus[] = ['confirmed', 'pending_payment', 'payment_processing', 'cancel_requested', 'reschedule_requested', 'cancelled'];
  const recent = bookings.slice(0, 6);
  const latestPayment = payments[0];

  const stats = [
    { label: 'Total bookings', value: overview.totalBookings, icon: Ticket, hint: 'All-time booking volume' },
    { label: "Today's bookings", value: overview.todaysBookings, icon: CalendarClock, hint: `${todayDepartures} departures today` },
    { label: 'Total revenue', value: formatCurrency(overview.revenue), icon: CircleDollarSign, hint: 'Confirmed trips only' },
    { label: 'Active routes', value: routes.length, icon: MapPinned, hint: 'Published travel corridors' },
    { label: 'Available buses', value: availableBuses, icon: Bus, hint: `${buses.length} buses in fleet` },
    { label: 'Pending cancellations', value: pendingCancellations, icon: TriangleAlert, hint: `${pendingChanges} total passenger changes` },
    { label: 'Pending reschedules', value: pendingReschedules, icon: RefreshCw, hint: 'Trips waiting for staff action' },
    { label: 'Failed payments', value: failedPayments, icon: CreditCard, hint: 'Needs finance review' },
    { label: 'Chatbot conversations', value: chatSessions.count, icon: MessageCircle, hint: chatSessions.configured ? 'Stored support sessions' : 'Firebase not configured' },
    { label: 'System health', value: 'Online', icon: ShieldCheck, hint: 'Core dashboard reachable' },
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-lg bg-navy p-6 text-white shadow-card-hover">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,193,7,0.24),transparent_26%),radial-gradient(circle_at_80%_10%,rgba(79,155,232,0.20),transparent_28%)]" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <Badge variant="gold">Admin command center</Badge>
            <h1 className="mt-4 font-heading text-3xl font-extrabold text-white">Manage the movement</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">
              Welcome back, {session?.name ?? 'SMG Admin'}. Your transport command center is ready.
            </p>
          </div>
          <Link
            href="/admin/schedules"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-gold px-5 text-sm font-semibold text-navy transition-transform hover:-translate-y-0.5"
          >
            <Plus className="size-4" /> Create schedule
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat, index) => (
          <article
            key={stat.label}
            className="animate-fade-in rounded-lg border border-white/70 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-2 font-heading text-2xl font-extrabold text-navy">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
              </div>
              <span className="grid size-11 place-items-center rounded-lg bg-gold/20 text-navy">
                <stat.icon className="size-5" />
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-extrabold text-navy">Quick actions</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center justify-between rounded-lg border border-border bg-white p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-gold"
                >
                  <span className="flex items-center gap-3 font-semibold text-navy">
                    <span className="grid size-10 place-items-center rounded-lg bg-navy/5 text-navy transition-colors group-hover:bg-gold/25">
                      <action.icon className="size-5" />
                    </span>
                    {action.label}
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-navy" />
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h2 className="font-heading text-lg font-extrabold text-navy">Recent activity</h2>
                <p className="text-sm text-muted-foreground">Latest booking movement across the network.</p>
              </div>
              <Megaphone className="size-5 text-gold" />
            </div>
            <div className="divide-y divide-border">
              {recent.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/booking/${booking.reference}`}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-semibold text-navy">{booking.origin} to {booking.destination}</p>
                    <p className="text-xs text-muted-foreground">
                      {booking.passenger.fullName} - {formatDate(booking.travelDate)} {formatTime(booking.departureTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookingStatusBadge status={booking.status} />
                    <span className="text-xs font-semibold text-navy">{formatCurrency(booking.total)}</span>
                  </div>
                </Link>
              ))}
              {recent.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">No recent booking activity yet.</div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-border bg-white p-5 shadow-card">
            <h2 className="font-heading text-lg font-extrabold text-navy">Booking status</h2>
            <div className="mt-4 space-y-3">
              {statusItems.map((status) => {
                const count = statusCounts[status] ?? 0;
                const total = Math.max(bookings.length, 1);
                const width = Math.round((count / total) * 100);
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <BookingStatusBadge status={status} />
                      <span className="font-semibold text-navy">{count}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-white p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-extrabold text-navy">System health</h2>
                <p className="text-sm text-muted-foreground">Core services are steady.</p>
              </div>
              <span className="grid size-11 place-items-center rounded-lg bg-green-100 text-green-700">
                <ShieldCheck className="size-5" />
              </span>
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Booking engine</span>
                <Badge variant="success">Online</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payments</span>
                <Badge variant={latestPayment ? 'success' : 'muted'}>{latestPayment ? 'Synced' : 'Idle'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Seat holds</span>
                <Badge variant="info">{overview.seatOccupancyRate}% occupancy</Badge>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
