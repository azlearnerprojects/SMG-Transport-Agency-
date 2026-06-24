'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { SearchCard } from '@/components/booking/search-card';
import { TripResults, type Trip } from '@/components/booking/trip-results';
import { formatDate } from '@/lib/format';

export type StaticTrip = Trip & {
  date: string;
};

export function BookSearchExperience({ cities, trips }: { cities: string[]; trips: StaticTrip[] }) {
  const searchParams = useSearchParams();
  const today = new Date().toISOString().slice(0, 10);
  const origin = searchParams.get('origin') ?? undefined;
  const destination = searchParams.get('destination') ?? undefined;
  const date = searchParams.get('date') ?? today;
  const passengers = Number(searchParams.get('passengers') ?? 1);
  const hasSearch = Boolean(origin && destination);

  const filteredTrips = useMemo(
    () =>
      hasSearch
        ? trips.filter((trip) => trip.origin === origin && trip.destination === destination && trip.date === date)
        : [],
    [date, destination, hasSearch, origin, trips],
  );

  return (
    <>
      <div className="container-page pt-8">
        <h1 className="font-heading text-2xl font-extrabold text-navy md:text-3xl">Find your trip</h1>
        <p className="mt-2 text-muted-foreground">Choose your route and date to see available departures.</p>
        <div className="mt-5">
          <SearchCard cities={cities} variant="inline" defaults={{ origin, destination, date, passengers }} />
        </div>
      </div>

      <div className="container-page mt-10">
        {hasSearch ? (
          <>
            <h2 className="mb-4 font-heading text-lg font-bold text-navy">
              {origin} - {destination} - {formatDate(date)}
            </h2>
            <TripResults trips={filteredTrips} />
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-white p-10 text-center">
            <p className="font-semibold text-navy">Search to see available trips</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a departure city, destination and date above, then press Search Trips.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
