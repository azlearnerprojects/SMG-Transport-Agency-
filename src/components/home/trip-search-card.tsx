'use client';

import { useId, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  ArrowUpDown,
  CalendarDays,
  CreditCard,
  Search,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/misc';
import { tripSearchSchema } from '@/lib/schemas';
import { LocationSelect } from './location-select';
import { MAX_PASSENGERS, MIN_PASSENGERS, PassengerSelector } from './passenger-selector';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const TRUST_INDICATORS = [
  { icon: ShieldCheck, label: 'Secure booking' },
  { icon: Ticket, label: 'Instant confirmation' },
  { icon: CreditCard, label: 'Multiple payment options' },
] as const;

export interface TripSearchDefaults {
  origin?: string;
  destination?: string;
  date?: string;
  passengers?: number;
}

/**
 * The floating "Find Your Trip" card. Reuses the shared `tripSearchSchema` for
 * validation and pushes to `/book` with the existing query contract
 * (origin, destination, date, passengers), so the downstream booking flow is
 * untouched. A route transition drives the button's loading state.
 */
export function TripSearchCard({
  cities,
  defaults,
  className,
}: {
  cities: string[];
  defaults?: TripSearchDefaults;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const uid = useId();

  const hasCities = cities.length >= 2;
  const [origin, setOrigin] = useState(defaults?.origin ?? cities[0] ?? '');
  const [destination, setDestination] = useState(defaults?.destination ?? cities[1] ?? '');
  const [date, setDate] = useState(defaults?.date ?? todayStr());
  const [passengers, setPassengers] = useState(
    Math.min(Math.max(defaults?.passengers ?? MIN_PASSENGERS, MIN_PASSENGERS), MAX_PASSENGERS),
  );
  const [error, setError] = useState<string | null>(null);

  const originId = `${uid}-origin`;
  const destinationId = `${uid}-destination`;
  const dateId = `${uid}-date`;
  const passengersId = `${uid}-passengers`;
  const errorId = `${uid}-error`;

  function swap() {
    setOrigin(destination);
    setDestination(origin);
    setError(null);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!hasCities) {
      setError('Routes are being prepared. Please check back soon or contact support.');
      return;
    }
    const parsed = tripSearchSchema.safeParse({ origin, destination, date, passengers });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please review your search details.');
      return;
    }
    setError(null);
    const query = new URLSearchParams({
      origin,
      destination,
      date,
      passengers: String(passengers),
    });
    startTransition(() => router.push(`/book?${query.toString()}`));
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Search for trips"
      aria-describedby={error ? errorId : undefined}
      className={[
        'w-full rounded-2xl border border-border bg-white p-5 shadow-card-hover sm:p-6',
        className ?? '',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600"
          aria-hidden
        >
          <Search className="size-5" />
        </span>
        <div>
          <h2 className="font-heading text-lg font-bold text-navy">Find Your Trip</h2>
          <p className="text-sm text-muted-foreground">
            Search routes, choose your seat and book in minutes.
          </p>
        </div>
      </div>

      {!hasCities && (
        <p className="mt-4 rounded-md border border-dashed border-border bg-cloud p-3 text-sm text-muted-foreground">
          Routes are being prepared by the SMG team. Active routes will appear here as soon as they are
          published.
        </p>
      )}

      <div className="mt-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <LocationSelect
            id={originId}
            label="From"
            value={origin}
            cities={cities}
            disabled={!hasCities}
            onChange={setOrigin}
          />
          <div className="flex justify-center sm:pb-1">
            <button
              type="button"
              onClick={swap}
              disabled={!hasCities}
              className="grid size-10 place-items-center rounded-full border border-input bg-white text-navy transition-colors hover:bg-navy/5 disabled:opacity-50"
              aria-label="Swap origin and destination"
            >
              <ArrowUpDown className="size-4 sm:hidden" />
              <ArrowLeftRight className="hidden size-4 sm:block" />
            </button>
          </div>
          <LocationSelect
            id={destinationId}
            label="To"
            value={destination}
            cities={cities}
            disabled={!hasCities}
            onChange={setDestination}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={dateId} className="block text-sm font-medium text-navy">
              Travel date
            </label>
            <div className="relative">
              <CalendarDays
                className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-orange-600"
                aria-hidden
              />
              <Input
                id={dateId}
                type="date"
                className="pl-9"
                min={todayStr()}
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>
          <PassengerSelector id={passengersId} value={passengers} onChange={setPassengers} />
        </div>

        <Button
          type="submit"
          variant="cta"
          size="lg"
          className="w-full"
          disabled={!hasCities || isPending}
        >
          {isPending ? (
            <>
              <Spinner className="text-white" /> Searching…
            </>
          ) : (
            <>
              <Search className="size-4" /> Search Trips
            </>
          )}
        </Button>
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-xs font-medium text-muted-foreground">
        {TRUST_INDICATORS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-1.5">
            <Icon className="size-4 text-navy" aria-hidden /> {label}
          </li>
        ))}
      </ul>
    </form>
  );
}
