import { Suspense } from 'react';
import { getDb } from '@/lib/db';
import { ProgressSteps } from '@/components/booking/progress-steps';
import { BookSearchExperience, type StaticTrip } from '@/components/booking/book-search-experience';
import { buildRouteMetadata } from '@/lib/seo';
import { isPublicRoute } from '@/lib/public-data';

export const metadata = buildRouteMetadata('/book');

export const dynamic = 'force-dynamic';

export default async function BookPage() {
  const db = getDb();
  const [cities, schedules, routes, buses, layouts] = await Promise.all([
    db.getCities(),
    db.listSchedules(),
    db.listRoutes(),
    db.listBuses(),
    db.listLayouts(),
  ]);

  const publicRoutes = routes.filter(isPublicRoute);
  const routeById = new Map(publicRoutes.map((r) => [r.id, r]));
  const busById = new Map(buses.map((b) => [b.id, b]));
  const layoutById = new Map(layouts.map((l) => [l.id, l]));
  const today = new Date().toISOString().slice(0, 10);

  // One pass over the schedule list instead of a per-city-pair search.
  // Availability here excludes 10-minute seat holds; the seat page re-checks live.
  const trips: StaticTrip[] = schedules
    .filter((s) => s.status === 'scheduled' && s.date >= today)
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
