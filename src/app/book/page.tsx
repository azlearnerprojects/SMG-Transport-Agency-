import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getDb } from '@/lib/db';
import { ProgressSteps } from '@/components/booking/progress-steps';
import { BookSearchExperience, type StaticTrip } from '@/components/booking/book-search-experience';

export const metadata: Metadata = {
  title: 'Book a Trip',
  description: 'Search SMG intercity departures, compare buses and fares, and pick your seat.',
};

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
  const cities = db.getCities();
  const dates = Array.from({ length: 7 }, (_, offset) => dateOnly(addDays(new Date(), offset)));
  const trips: StaticTrip[] = [];

  for (const origin of cities) {
    for (const destination of cities) {
      if (origin === destination) continue;
      for (const date of dates) {
        trips.push(
          ...db.searchSchedules({ origin, destination, date }).map((e) => ({
            scheduleId: e.schedule.id,
            origin: e.route.origin,
            destination: e.route.destination,
            date: e.schedule.date,
            departureTime: e.schedule.departureTime,
            arrivalTime: e.schedule.arrivalTime,
            durationMinutes: e.route.durationMinutes,
            busNumber: e.bus.busNumber,
            busCategory: e.bus.category,
            amenities: e.bus.amenities,
            availableSeats: e.availableSeats,
            minFare: e.minFare,
          })),
        );
      }
    }
  }

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
