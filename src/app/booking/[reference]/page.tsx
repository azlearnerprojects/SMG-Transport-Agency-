import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { BookingDetails } from '@/components/booking/booking-details';
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate, formatTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Booking details', robots: { index: false } };

export default async function BookingPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const db = getDb();
  const booking = await db.getBookingByReference(reference);
  if (!booking) notFound();

  return (
    <div className="container-page max-w-3xl py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-navy">Booking {booking.reference}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm">
            <BookingStatusBadge status={booking.status} />
            <PaymentStatusBadge status={booking.paymentStatus} />
          </p>
        </div>
        {booking.status === 'confirmed' && (
          <Link href={`/ticket/${booking.reference}`}><Button>View e-ticket</Button></Link>
        )}
        {booking.status === 'pending_payment' && (
          <Link href={`/book/review/${booking.reference}`}><Button>Complete payment</Button></Link>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <BookingDetails booking={booking} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Booking history</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {booking.history.map((e) => (
              <li key={e.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1 size-2 shrink-0 rounded-full bg-gold" />
                <div>
                  <p className="font-medium text-navy">{e.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(e.at)} {formatTime(e.at)} · {e.actor}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="mt-6 flex gap-3">
        <Link href="/manage"><Button variant="outline">Manage / cancel</Button></Link>
        <Link href="/"><Button variant="ghost">Back to home</Button></Link>
      </div>
    </div>
  );
}
