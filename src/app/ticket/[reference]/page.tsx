import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Bus, MapPin, Info } from 'lucide-react';
import { getDb } from '@/lib/db';
import { generateTicketQr } from '@/lib/qr';
import { getPublicSiteConfig } from '@/lib/site-config';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/misc';
import { TicketActions } from '@/components/booking/ticket-actions';
import { Logo } from '@/components/layout/logo';

export const metadata: Metadata = { title: 'Your e-ticket', robots: { index: false } };

export default async function TicketPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const db = getDb();
  const [booking, { config: site }] = await Promise.all([
    db.getBookingByReference(reference),
    getPublicSiteConfig(),
  ]);
  if (!booking) notFound();

  const confirmed = booking.status === 'confirmed' || booking.status === 'checked_in' || booking.status === 'completed';

  if (!confirmed) {
    return (
      <div className="container-page max-w-lg py-16 text-center">
        <Alert variant="warning" title="Ticket not available yet">
          This booking ({booking.reference}) is not confirmed. Please complete payment to receive your e-ticket.
        </Alert>
        <div className="mt-6">
          <Link href={`/book/review/${booking.reference}`}><Button>Complete payment</Button></Link>
        </div>
      </div>
    );
  }

  const qr = await generateTicketQr(booking.reference);

  return (
    <div className="container-page max-w-2xl py-10">
      <div className="mb-6">
        <TicketActions reference={booking.reference} />
      </div>

      {/* Ticket */}
      <Card className="overflow-hidden border-2 border-navy/10 print:border-navy">
        <div className="flex items-center justify-between bg-navy px-6 py-4 text-white">
          <div className="rounded-md bg-white/95 p-1.5">
            <Logo compact />
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-white/70">Electronic Ticket</p>
            <p className="font-heading text-lg font-bold">{booking.reference}</p>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-2xl font-extrabold text-navy">
                <MapPin className="size-5 text-gold" />
                {booking.origin} → {booking.destination}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Info2 label="Passenger" value={booking.passenger.fullName} />
                <Info2 label="Ticket no." value={booking.ticketNumber} />
                <Info2 label="Travel date" value={formatDate(booking.travelDate)} />
                <Info2 label="Departure" value={formatTime(booking.departureTime)} />
                <Info2 label="Boarding" value={booking.boardingPoint} />
                <Info2 label="Bus" value={`${booking.busNumber} · ${booking.busCategory.toUpperCase()}`} />
                <Info2 label="Seat(s)" value={booking.seatIds.join(', ')} />
                <Info2 label="Class" value={booking.seatCategory} />
                <Info2 label="Paid" value={formatCurrency(booking.total)} />
                <Info2 label="Status" value="Confirmed" />
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-lg border border-border p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={`QR code for booking ${booking.reference}`} width={180} height={180} />
              <p className="mt-2 text-center text-xs text-muted-foreground">Scan at boarding to verify</p>
            </div>
          </div>

          <div className="mt-6 rounded-md bg-cloud p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-navy">
              <Info className="size-4 text-gold" /> Before you travel
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Arrive at the terminal at least 30 minutes before departure.</li>
              <li>Bring a valid ID matching the passenger name on this ticket.</li>
              <li>Present this QR code (on your phone or printed) for verification.</li>
            </ul>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Bus className="size-3.5" /> {site.siteName}</span>
            <span>Support: {site.supportPhone} · {site.supportEmail}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Info2({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium capitalize text-navy">{value}</p>
    </div>
  );
}
