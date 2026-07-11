import { getDb } from '@/lib/db';
import { jsonOk, withErrorHandling } from '@/lib/api';

/** GET /api/schedules?routeId=&date= — lite list of bookable departures (for reschedule). */
export const GET = withErrorHandling(async (req: Request) => {
  const url = new URL(req.url);
  const routeId = url.searchParams.get('routeId');
  const date = url.searchParams.get('date');
  const db = getDb();

  const schedules = await db.listSchedules();
  const candidates = schedules.filter(
    (s) => s.status === 'scheduled' && (!routeId || s.routeId === routeId) && (!date || s.date === date),
  );
  const views = await Promise.all(candidates.map((schedule) => db.getScheduleView(schedule.id)));
  const list = candidates
    .flatMap((_, index) => {
      const view = views[index];
      if (!view) return [];
      const { schedule, bus } = view;
      return [
        {
          scheduleId: schedule.id,
          date: schedule.date,
          departureTime: schedule.departureTime,
          arrivalTime: schedule.arrivalTime,
          busNumber: bus.busNumber,
          busCategory: bus.category,
          availableSeats: view.availableSeats,
          minFare: view.minFare,
        },
      ];
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.departureTime.localeCompare(b.departureTime));

  return jsonOk({ schedules: list });
});
