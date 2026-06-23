'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Search, XCircle, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Alert, Spinner } from '@/components/ui/misc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookingStatusBadge } from '@/components/shared/status-badge';
import { BookingDetails } from '@/components/booking/booking-details';
import { bookingLookupSchema } from '@/lib/schemas';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';
import type { Booking } from '@/lib/types';
import type { z } from 'zod';

type LookupInput = z.infer<typeof bookingLookupSchema>;

interface Quote {
  eligibility: { allowed: boolean; reason?: string };
  reschedule: { allowed: boolean; reason?: string };
  refund: { refundable: boolean; cancellationFee: number; refundAmount: number; note: string };
}

interface Alt {
  scheduleId: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  busNumber: string;
  availableSeats: number;
  minFare: number;
}

export function ManageBooking() {
  const { register, handleSubmit, formState: { errors } } = useForm<LookupInput>({
    resolver: zodResolver(bookingLookupSchema),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // reschedule mini-state
  const [showReschedule, setShowReschedule] = useState(false);
  const [altDate, setAltDate] = useState('');
  const [alts, setAlts] = useState<Alt[]>([]);
  const [altsLoading, setAltsLoading] = useState(false);

  async function onLookup(values: LookupInput) {
    setLoading(true);
    setError(null);
    setBooking(null);
    setActionMsg(null);
    try {
      const res = await fetch('/api/bookings/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'No booking found.');
        return;
      }
      setBooking(json.data.booking);
      setQuote(json.data.quote);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    if (!booking) return;
    if (!confirm('Cancel this booking? This cannot be undone.')) return;
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/bookings/${booking.reference}/cancel`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setActionMsg(json.error ?? 'Could not cancel.');
        return;
      }
      setBooking(json.data.booking);
      setActionMsg(`Booking cancelled. Refund: ${formatCurrency(json.data.refund?.refundAmount ?? 0)}.`);
    } finally {
      setBusy(false);
    }
  }

  async function findAlternatives() {
    if (!booking || !altDate) return;
    setAltsLoading(true);
    setAlts([]);
    try {
      const res = await fetch(`/api/schedules?routeId=${booking.routeId}&date=${altDate}`);
      const json = await res.json();
      setAlts((json.data?.schedules ?? []).filter((a: Alt) => a.scheduleId !== booking.scheduleId));
    } finally {
      setAltsLoading(false);
    }
  }

  async function doReschedule(scheduleId: string) {
    if (!booking) return;
    setBusy(true);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/bookings/${booking.reference}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newScheduleId: scheduleId, seatIds: booking.seatIds }),
      });
      const json = await res.json();
      if (!res.ok) {
        setActionMsg(json.error ?? 'Could not reschedule. Your seat may be taken on that trip.');
        return;
      }
      setBooking(json.data.booking);
      setShowReschedule(false);
      setActionMsg('Booking rescheduled successfully.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Find your booking</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onLookup)} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Booking reference" htmlFor="reference" required error={errors.reference?.message}>
              <Input id="reference" placeholder="e.g. SMG-XXXXXXXX" {...register('reference')} aria-invalid={!!errors.reference} />
            </Field>
            <Field label="Email or phone" htmlFor="contact" required error={errors.contact?.message}>
              <Input id="contact" placeholder="Used when booking" {...register('contact')} aria-invalid={!!errors.contact} />
            </Field>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Find
            </Button>
          </form>
          {error && <Alert variant="danger" className="mt-4">{error}</Alert>}
        </CardContent>
      </Card>

      {booking && quote && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Booking {booking.reference}</CardTitle>
            <BookingStatusBadge status={booking.status} />
          </CardHeader>
          <CardContent className="space-y-5">
            <BookingDetails booking={booking} />

            {actionMsg && <Alert variant="info">{actionMsg}</Alert>}

            {booking.status === 'confirmed' && (
              <div className="flex flex-wrap gap-3 border-t border-border pt-4">
                <Link href={`/ticket/${booking.reference}`}><Button variant="primary">View e-ticket</Button></Link>

                <div className="flex flex-col gap-1">
                  <Button variant="outline" onClick={() => setShowReschedule((v) => !v)} disabled={!quote.reschedule.allowed}>
                    <CalendarClock className="size-4" /> Reschedule
                  </Button>
                  {!quote.reschedule.allowed && <span className="text-xs text-muted-foreground">{quote.reschedule.reason}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <Button variant="destructive" onClick={cancel} disabled={busy || !quote.eligibility.allowed}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />} Cancel booking
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {quote.eligibility.allowed ? quote.refund.note : quote.eligibility.reason}
                  </span>
                </div>
              </div>
            )}

            {showReschedule && quote.reschedule.allowed && (
              <div className="rounded-md border border-border bg-cloud p-4">
                <p className="text-sm font-semibold text-navy">Choose a new date for {booking.origin} → {booking.destination}</p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <Field label="New travel date" htmlFor="altDate">
                    <Input id="altDate" type="date" min={new Date().toISOString().slice(0, 10)} value={altDate} onChange={(e) => setAltDate(e.target.value)} />
                  </Field>
                  <Button variant="navy" onClick={findAlternatives} disabled={!altDate || altsLoading}>
                    {altsLoading ? <Spinner /> : 'Find trips'}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">We&rsquo;ll keep your current seat(s) {booking.seatIds.join(', ')} if available.</p>
                <div className="mt-3 space-y-2">
                  {alts.map((a) => (
                    <div key={a.scheduleId} className="flex items-center justify-between rounded-md border border-border bg-white p-3 text-sm">
                      <span>
                        <strong>{formatTime(a.departureTime)}</strong> · {formatDate(a.date)} · Bus {a.busNumber} ·{' '}
                        <Badge variant="muted">{a.availableSeats} seats</Badge>
                      </span>
                      <Button size="sm" onClick={() => doReschedule(a.scheduleId)} disabled={busy || a.availableSeats <= 0}>
                        Select
                      </Button>
                    </div>
                  ))}
                  {!altsLoading && altDate && alts.length === 0 && (
                    <p className="text-sm text-muted-foreground">No alternative trips found for that date.</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
