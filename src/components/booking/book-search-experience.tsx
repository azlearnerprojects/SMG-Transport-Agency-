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

  // Only treat the view as "searched" when the user actually submitted a route.
  // With no query params we show every configured trip.
  const searchOrigin = searchParams.get('origin');
  const searchDestination = searchParams.get('destination');
  const searchDate = searchParams.get('date');
  const passengers = Number(searchParams.get('passengers') ?? 1);
  const hasSearch = Boolean(searchOrigin && searchDestination);

  const origin = searchOrigin ?? trips[0]?.origin;
  const destination = searchDestination ?? trips[0]?.destination;
  const date = searchDate ?? trips[0]?.date ?? today;

  const visibleTrips = useMemo(
    () =>
      hasSearch
        ? trips.filter(
            (trip) =>
              trip.origin === searchOrigin &&
              trip.destination === searchDestination &&
              (!searchDate || trip.date === searchDate),
          )
        : trips,
    [hasSearch, searchOrigin, searchDestination, searchDate, trips],
  );

  return (
    <>
      <div className="container-page pt-8">
        <h1 className="font-heading text-2xl font-extrabold text-navy md:text-3xl">Find your trip</h1>
        <p className="mt-2 text-muted-foreground">Browse every available departure, or search for a specific route.</p>
        <div className="mt-5">
          <SearchCard cities={cities} variant="inline" defaults={{ origin, destination, date, passengers }} />
        </div>
      </div>

      <div className="container-page mt-10">
        <h2 className="mb-4 font-heading text-lg font-bold text-navy">
          {hasSearch ? `${origin} - ${destination} - ${formatDate(date)}` : 'All available trips'}
        </h2>
        <TripResults trips={visibleTrips} />
      </div>
    </>
  );
}
