import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { AdminPageTitle, DataTable, type Column } from '@/components/admin/admin-ui';
import { CsvButton } from '@/components/admin/csv-button';
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/shared/status-badge';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';
import type { Booking } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin · Bookings' };

export default async function AdminBookings() {
  const db = getDb();
  const bookings = await db.listBookings();

  const csv = bookings.map((b) => ({
    reference: b.reference,
    passenger: b.passenger.fullName,
    phone: b.passenger.phone,
    email: b.passenger.email,
    route: `${b.origin} > ${b.destination}`,
    travelDate: b.travelDate,
    departure: b.departureTime,
    bus: b.busNumber,
    seats: b.seatIds.join(' '),
    class: b.seatCategory,
    total: b.total,
    status: b.status,
    payment: b.paymentStatus,
    bookedAt: b.createdAt,
  }));

  const cols: Column<Booking>[] = [
    { key: 'reference', header: 'Ref', render: (b) => <Link href={`/booking/${b.reference}`} className="font-medium text-navy underline">{b.reference}</Link> },
    { key: 'passenger', header: 'Passenger', render: (b) => <><div>{b.passenger.fullName}</div><div className="text-xs text-muted-foreground">{b.passenger.phone}</div></> },
    { key: 'route', header: 'Route', render: (b) => `${b.origin} → ${b.destination}` },
    { key: 'travel', header: 'Travel', render: (b) => `${formatDate(b.travelDate)} ${formatTime(b.departureTime)}` },
    { key: 'seats', header: 'Seats', render: (b) => `${b.seatIds.join(', ')} (${b.seatCategory})` },
    { key: 'total', header: 'Total', render: (b) => formatCurrency(b.total) },
    { key: 'status', header: 'Status', render: (b) => <BookingStatusBadge status={b.status} /> },
    { key: 'payment', header: 'Payment', render: (b) => <PaymentStatusBadge status={b.paymentStatus} /> },
  ];

  return (
    <>
      <AdminPageTitle
        title="Bookings"
        description={`${bookings.length} total. View the passenger manifest, resend tickets and export records.`}
        action={<CsvButton filename="smg-bookings" rows={csv} />}
      />
      <DataTable columns={cols} rows={bookings} empty="No bookings yet." />
    </>
  );
}
