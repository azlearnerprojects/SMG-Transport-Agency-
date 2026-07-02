import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { ProgressSteps } from '@/components/booking/progress-steps';
import { SeatBooking } from '@/components/booking/seat-booking';

export const metadata: Metadata = {
  title: 'Select seat & passenger details',
  robots: { index: false },
};

export default async function SeatPage({ params }: { params: Promise<{ scheduleId: string }> }) {
  const { scheduleId } = await params;
  const db = getDb();
  const view = await db.getScheduleView(scheduleId);
  if (!view) notFound();

  const statuses = await db.seatStatuses(scheduleId);

  return (
    <div className="bg-cloud pb-16">
      <div className="border-b border-border bg-white">
        <div className="container-page py-6">
          <ProgressSteps current={2} />
        </div>
      </div>
      <div className="container-page pt-8">
        <SeatBooking
          trip={{
            scheduleId: view.schedule.id,
            origin: view.route.origin,
            destination: view.route.destination,
            date: view.schedule.date,
            departureTime: view.schedule.departureTime,
            arrivalTime: view.schedule.arrivalTime,
            busNumber: view.bus.busNumber,
            busCategory: view.bus.category,
            fares: view.schedule.fares,
            serviceFee: view.schedule.serviceFee,
          }}
          cells={view.layout.cells}
          cols={view.layout.cols}
          statuses={statuses}
        />
      </div>
    </div>
  );
}
