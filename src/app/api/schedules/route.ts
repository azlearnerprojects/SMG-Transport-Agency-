import { getDb } from '@/lib/db';
import { jsonOk, withErrorHandling } from '@/lib/api';

/** GET /api/schedules?routeId=&date= — lite list of bookable departures (for reschedule). */
export const GET = withErrorHandling(async (req: Request) => {
  const url = new URL(req.url);
  const routeId = url.searchParams.get('routeId');
  const date = url.searchParams.get('date');
  const db = getDb();

  const list = db
    .listSchedules()
    .filter((s) => s.status === 'scheduled' && (!routeId || s.routeId === routeId) && (!date || s.date === date))
    .map((s) => {
      const view = db.getScheduleView(s.id);
      return view
        ? {
            scheduleId: s.id,
            date: s.date,
            departureTime: s.departureTime,
            arrivalTime: s.arrivalTime,
            busNumber: view.bus.busNumber,
            busCategory: view.bus.category,
            availableSeats: view.availableSeats,
            minFare: view.minFare,
          }
        : null;
    })
    .filter(Boolean);

  return jsonOk({ schedules: list });
});
