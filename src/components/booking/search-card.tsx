'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeftRight, CalendarDays, MapPin, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/misc';
import { tripSearchSchema } from '@/lib/schemas';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SearchCard({
  cities,
  defaults,
  variant = 'hero',
}: {
  cities: string[];
  defaults?: { origin?: string; destination?: string; date?: string; passengers?: number };
  variant?: 'hero' | 'inline';
}) {
  const router = useRouter();
  const [origin, setOrigin] = useState(defaults?.origin ?? cities[0] ?? '');
  const [destination, setDestination] = useState(defaults?.destination ?? cities[1] ?? '');
  const [date, setDate] = useState(defaults?.date ?? todayStr());
  const [passengers, setPassengers] = useState(defaults?.passengers ?? 1);
  const [error, setError] = useState<string | null>(null);

  function swap() {
    setOrigin(destination);
    setDestination(origin);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = tripSearchSchema.safeParse({ origin, destination, date, passengers });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your search');
      return;
    }
    setError(null);
    const q = new URLSearchParams({ origin, destination, date, passengers: String(passengers) });
    router.push(`/book?${q.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        variant === 'hero'
          ? 'rounded-xl border border-border bg-white p-5 shadow-card-hover'
          : 'rounded-xl border border-border bg-white p-5 shadow-card'
      }
      aria-label="Search for trips"
    >
      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <Field label="From" htmlFor="origin">
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Select id="origin" className="pl-9" value={origin} onChange={(e) => setOrigin(e.target.value)}>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
            </Field>
            <button
              type="button"
              onClick={swap}
              className="mb-1 hidden size-10 items-center justify-center rounded-md border border-input text-navy hover:bg-navy/5 sm:inline-flex"
              aria-label="Swap origin and destination"
            >
              <ArrowLeftRight className="size-4" />
            </button>
            <Field label="To" htmlFor="destination">
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Select id="destination" className="pl-9" value={destination} onChange={(e) => setDestination(e.target.value)}>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
            </Field>
          </div>
        </div>

        <div className="md:col-span-3">
          <Field label="Travel date" htmlFor="date">
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="date" type="date" min={todayStr()} className="pl-9" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </Field>
        </div>

        <div className="md:col-span-2">
          <Field label="Passengers" htmlFor="passengers">
            <div className="relative">
              <Users className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Select id="passengers" className="pl-9" value={passengers} onChange={(e) => setPassengers(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'passenger' : 'passengers'}
                  </option>
                ))}
              </Select>
            </div>
          </Field>
        </div>

        <div className="flex items-end md:col-span-2">
          <Button type="submit" size="lg" className="w-full">
            <Search className="size-4" /> Search Trips
          </Button>
        </div>
      </div>
      {error && (
        <p className="mt-3 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
