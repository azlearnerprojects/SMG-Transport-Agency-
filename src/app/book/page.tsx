import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getDb } from '@/lib/db';
import { ProgressSteps } from '@/components/booking/progress-steps';
import { BookSearchExperience, type StaticTrip } from '@/components/booking/book-search-experience';

export const metadata: Metadata = {
  title: 'Book a Trip',
  description: 'Search SMG intercity departures, compare buses and fares, and pick your seat.',
};

export const dynamic = 'force-dynamic';

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export default async function BookPage() {
  const db = getDb();
  const [cities, schedules, routes, buses, layouts] = await Promise.all([
    db.getCities(),
    db.listSchedules(),
    db.listRoutes(),
    db.listBuses(),
    db.listLayouts(),
  ]);

  const routeById = new Map(routes.map((r) => [r.id, r]));
  const busById = new Map(buses.map((b) => [b.id, b]));
  const layoutById = new Map(layouts.map((l) => [l.id, l]));
  const dates = new Set(Array.from({ length: 7 }, (_, offset) => dateOnly(addDays(new Date(), offset))));

  // One pass over the schedule list instead of a per-city-pair search.
  // Availability here excludes 10-minute seat holds; the seat page re-checks live.
  const trips: StaticTrip[] = schedules
    .filter((s) => s.status === 'scheduled' && dates.has(s.date))
    .flatMap((s) => {
      const route = routeById.get(s.routeId);
      const bus = busById.get(s.busId);
      const layout = bus ? layoutById.get(bus.seatLayoutId) : undefined;
      if (!route || !bus || !layout) return [];
      const occupied = new Set([...s.bookedSeatIds, ...bus.blockedSeatIds]);
      return [
        {
          scheduleId: s.id,
          origin: route.origin,
          destination: route.destination,
          date: s.date,
          departureTime: s.departureTime,
          arrivalTime: s.arrivalTime,
          durationMinutes: route.durationMinutes,
          busNumber: bus.busNumber,
          busCategory: bus.category,
          amenities: bus.amenities,
          availableSeats: layout.capacity - occupied.size,
          minFare: Math.min(s.fares.standard, s.fares.business, s.fares.vip),
        },
      ];
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.departureTime.localeCompare(b.departureTime));

  return (
    <div className="bg-cloud pb-16">
      <div className="border-b border-border bg-white">
        <div className="container-page py-6">
          <ProgressSteps current={1} />
        </div>
      </div>

      <Suspense fallback={<div className="container-page py-12 text-sm text-muted-foreground">Loading trips...</div>}>
        <BookSearchExperience cities={cities} trips={trips} />
      </Suspense>
    </div>
  );
}
