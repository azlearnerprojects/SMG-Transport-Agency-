'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field, Checkbox, Alert } from '@/components/ui/misc';
import { SeatMap } from './seat-map';
import { FareSummary } from './fare-summary';
import { passengerSchema, type PassengerInput } from '@/lib/schemas';
import { useCustomerAuth } from '@/lib/auth/customer-auth';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { getSessionId } from '@/lib/session-id';
import { formatCurrency, formatDate, formatTime } from '@/lib/format';
import type { SeatCell, FareTable, SeatCategory, BusCategory } from '@/lib/types';
import type { SeatStatus } from '@/lib/data/store';

interface TripInfo {
  scheduleId: string;
  origin: string;
  destination: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  busNumber: string;
  busCategory: BusCategory;
  fares: FareTable;
  serviceFee: number;
}

const DRAFT_KEY = 'smg_passenger_draft';
const PICKUP_POINTS = ['Oldsite Terminal', 'Science Terminal', 'Valco Junction'] as const;

export function SeatBooking({
  trip,
  cells,
  cols,
  statuses,
}: {
  trip: TripInfo;
  cells: SeatCell[];
  cols: number;
  statuses: Record<string, SeatStatus>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [category, setCategory] = useState<SeatCategory | null>(null);
  const [seatError, setSeatError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [boardingPoint, setBoardingPoint] = useState<(typeof PICKUP_POINTS)[number]>(PICKUP_POINTS[0]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useCustomerAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PassengerInput>({
    resolver: zodResolver(passengerSchema),
    defaultValues: { idType: 'ghana_card' },
  });

  // Restore any saved passenger draft (preserves progress on back-navigation).
  // If there is no draft, seed the form from the signed-in customer profile.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        reset(JSON.parse(raw));
        return;
      }
    } catch {
      /* ignore */
    }
    if (user) {
      reset({
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        idType: 'ghana_card',
      });
    }
  }, [reset, user]);

  function toggleSeat(seatId: string, seatCategory: string) {
    setSeatError(null);
    setSelected((prev) => {
      if (prev.includes(seatId)) {
        const next = prev.filter((s) => s !== seatId);
        if (next.length === 0) setCategory(null);
        return next;
      }
      if (category && category !== seatCategory) {
        setSeatError('All selected seats must be the same class. Deselect first to switch class.');
        return prev;
      }
      if (prev.length >= 5) {
        setSeatError('You can select up to 5 seats per booking.');
        return prev;
      }
      setCategory(seatCategory as SeatCategory);
      return [...prev, seatId];
    });
  }

  const fare = useMemo(() => {
    if (!category || selected.length === 0) return { baseFare: 0, fees: 0, discount: 0, total: 0 };
    const base = trip.fares[category] * selected.length;
    const fees = trip.serviceFee * selected.length;
    return { baseFare: base, fees, discount: 0, total: base + fees };
  }, [category, selected, trip.fares, trip.serviceFee]);

  async function onValid(passenger: PassengerInput) {
    setSubmitError(null);
    if (selected.length === 0 || !category) {
      setSeatError('Please select at least one seat.');
      return;
    }
    if (!consent) {
      setConsentError('You must accept the terms to continue.');
      return;
    }
    setConsentError(null);
    setSubmitting(true);
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(passenger));
      const sessionId = getSessionId();

      // 1) Hold the seats atomically on the server.
      const holdRes = await fetch('/api/holds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: trip.scheduleId, seatIds: selected, sessionId }),
      });
      const holdJson = await holdRes.json();
      if (!holdRes.ok) {
        setSubmitError(holdJson.error ?? 'Those seats are no longer available.');
        router.refresh(); // refresh seat statuses
        setSelected([]);
        setCategory(null);
        return;
      }

      // 2) Create the pending booking (server recomputes the fare).
      const auth = user?.provider === 'firebase' ? await getFirebaseAuth() : null;
      const token = await auth?.currentUser?.getIdToken().catch(() => undefined);
      const bookingRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          scheduleId: trip.scheduleId,
          seatIds: selected,
          seatCategory: category,
          passenger,
          boardingPoint,
          promoCode: promoCode || undefined,
          sessionId,
          consent: true,
          holdId: holdJson.data.hold.id,
        }),
      });
      const bookingJson = await bookingRes.json();
      if (!bookingRes.ok) {
        setSubmitError(bookingJson.error ?? 'Could not create your booking. Please try again.');
        return;
      }
      router.push(`/book/review/${bookingJson.data.booking.reference}`);
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Link href="/book" className="inline-flex items-center gap-1 text-sm font-medium text-navy hover:underline">
          <ArrowLeft className="size-4" /> Back to results
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Choose your seat</CardTitle>
          </CardHeader>
          <CardContent>
            {seatError && <Alert variant="warning" className="mb-4">{seatError}</Alert>}
            <SeatMap cells={cells} cols={cols} statuses={statuses} selected={selected} onToggle={toggleSeat} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Passenger details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Pickup point" htmlFor="boardingPoint" required>
                <Select
                  id="boardingPoint"
                  value={boardingPoint}
                  onChange={(e) => setBoardingPoint(e.target.value as typeof boardingPoint)}
                >
                  {PICKUP_POINTS.map((point) => (
                    <option key={point} value={point}>
                      {point}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Full name" htmlFor="fullName" required error={errors.fullName?.message}>
                <Input id="fullName" {...register('fullName')} aria-invalid={!!errors.fullName} placeholder="As shown on your ID" />
              </Field>
            </div>
            <Field label="Phone number" htmlFor="phone" required error={errors.phone?.message} hint="e.g. 0241234567">
              <Input id="phone" type="tel" {...register('phone')} aria-invalid={!!errors.phone} />
            </Field>
            <Field label="Email address" htmlFor="email" required error={errors.email?.message}>
              <Input id="email" type="email" {...register('email')} aria-invalid={!!errors.email} />
            </Field>
            <Field label="ID type" htmlFor="idType" error={errors.idType?.message}>
              <Select id="idType" {...register('idType')}>
                <option value="ghana_card">Ghana Card</option>
                <option value="national_id">National ID</option>
                <option value="passport">Passport</option>
                <option value="student_id">Student ID</option>
                <option value="none">Prefer not to say</option>
              </Select>
            </Field>
            <Field label="ID number" htmlFor="idNumber" error={errors.idNumber?.message}>
              <Input id="idNumber" {...register('idNumber')} placeholder="Optional" />
            </Field>
            <Field label="Emergency contact name" htmlFor="ecn" error={errors.emergencyContactName?.message}>
              <Input id="ecn" {...register('emergencyContactName')} placeholder="Optional" />
            </Field>
            <Field label="Emergency contact phone" htmlFor="ecp" error={errors.emergencyContactPhone?.message}>
              <Input id="ecp" type="tel" {...register('emergencyContactPhone')} placeholder="Optional" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Special assistance" htmlFor="sa" error={errors.specialAssistance?.message}>
                <Input id="sa" {...register('specialAssistance')} placeholder="Optional — let us know how we can help" />
              </Field>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky summary / continue */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="size-5 text-gold" /> Your trip
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <p className="font-heading text-base font-bold text-navy">
                {trip.origin} → {trip.destination}
              </p>
              <p className="text-muted-foreground">
                {formatDate(trip.date)} · {formatTime(trip.departureTime)}–{formatTime(trip.arrivalTime)}
              </p>
              <p className="text-muted-foreground">Pickup: {boardingPoint}</p>
              <p className="text-muted-foreground">Bus {trip.busNumber} · {trip.busCategory.toUpperCase()}</p>
            </div>

            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium text-navy">
                {selected.length ? `Seats: ${selected.join(', ')}` : 'No seat selected yet'}
              </p>
              {category && (
                <p className="text-muted-foreground">
                  Class: <span className="font-medium capitalize">{category}</span> · {formatCurrency(trip.fares[category])}/seat
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="promo" className="text-sm font-medium text-navy">Promo code (optional)</label>
              <Input
                id="promo"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="e.g. EARLYBIRD"
              />
              <p className="text-xs text-muted-foreground">Discount is applied and shown on the next step.</p>
            </div>

            {selected.length > 0 && category && <FareSummary fare={fare} seatCount={selected.length} currencyNote />}

            <label className="flex items-start gap-2 text-sm text-navy">
              <Checkbox checked={consent} onChange={(e) => { setConsent(e.target.checked); setConsentError(null); }} className="mt-0.5" />
              <span>
                I accept the{' '}
                <Link href="/terms" className="underline" target="_blank">Terms</Link>,{' '}
                <Link href="/privacy" className="underline" target="_blank">Privacy Policy</Link> and{' '}
                <Link href="/policies/cancellation" className="underline" target="_blank">booking conditions</Link>.
              </span>
            </label>
            {consentError && <p className="text-xs font-medium text-red-600" role="alert">{consentError}</p>}
            {submitError && <Alert variant="danger">{submitError}</Alert>}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? <><Loader2 className="size-4 animate-spin" /> Holding seats…</> : 'Continue to review'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Your seat is held for a few minutes while you complete payment.
            </p>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
