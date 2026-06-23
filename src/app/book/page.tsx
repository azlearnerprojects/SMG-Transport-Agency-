import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { SearchCard } from '@/components/booking/search-card';
import { ProgressSteps } from '@/components/booking/progress-steps';
import { TripResults, type Trip } from '@/components/booking/trip-results';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Book a Trip',
  description: 'Search SMG intercity departures, compare buses and fares, and pick your seat.',
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const db = getDb();
  const cities = db.getCities();

  const origin = typeof sp.origin === 'string' ? sp.origin : undefined;
  const destination = typeof sp.destination === 'string' ? sp.destination : undefined;
  const date = typeof sp.date === 'string' ? sp.date : new Date().toISOString().slice(0, 10);
  const passengers = typeof sp.passengers === 'string' ? Number(sp.passengers) : 1;

  const hasSearch = Boolean(origin && destination);
  let trips: Trip[] = [];
  if (hasSearch && origin && destination) {
    trips = db.searchSchedules({ origin, destination, date }).map((e) => ({
      scheduleId: e.schedule.id,
      origin: e.route.origin,
      destination: e.route.destination,
      departureTime: e.schedule.departureTime,
      arrivalTime: e.schedule.arrivalTime,
      durationMinutes: e.route.durationMinutes,
      busNumber: e.bus.busNumber,
      busCategory: e.bus.category,
      amenities: e.bus.amenities,
      availableSeats: e.availableSeats,
      minFare: e.minFare,
    }));
  }

  return (
    <div className="bg-cloud pb-16">
      <div className="border-b border-border bg-white">
        <div className="container-page py-6">
          <ProgressSteps current={1} />
        </div>
      </div>

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
              {origin} → {destination} · {formatDate(date)}
            </h2>
            <TripResults trips={trips} />
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-white p-10 text-center">
            <p className="font-semibold text-navy">Search to see available trips</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a departure city, destination and date above, then press “Search Trips”.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
