import { getDb } from '@/lib/db';
import { jsonOk, withErrorHandling } from '@/lib/api';

/** GET /api/schedules?routeId=&date= — lite list of bookable departures (for reschedule). */
export const GET = withErrorHandling(async (req: Request) => {
  const url = new URL(req.url);
  const routeId = url.searchParams.get('routeId');
  const date = url.searchParams.get('date');
  const db = getDb();

  const [schedules, buses, layouts] = await Promise.all([
    db.listSchedules(),
    db.listBuses(),
    db.listLayouts(),
  ]);
  const busById = new Map(buses.map((bus) => [bus.id, bus]));
  const layoutById = new Map(layouts.map((layout) => [layout.id, layout]));
  const candidates = schedules.filter(
    (s) => s.status === 'scheduled' && (!routeId || s.routeId === routeId) && (!date || s.date === date),
  );
  const list = candidates
    .flatMap((s) => {
      const bus = busById.get(s.busId);
      const layout = bus ? layoutById.get(bus.seatLayoutId) : undefined;
      if (!bus || !layout) return [];
      const occupied = new Set([...s.bookedSeatIds, ...bus.blockedSeatIds]);
      return [
        {
          scheduleId: s.id,
          date: s.date,
          departureTime: s.departureTime,
          arrivalTime: s.arrivalTime,
          busNumber: bus.busNumber,
          busCategory: bus.category,
          availableSeats: layout.capacity - occupied.size,
          minFare: Math.min(s.fares.standard, s.fares.business, s.fares.vip),
        },
      ];
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.departureTime.localeCompare(b.departureTime));

  return jsonOk({ schedules: list });
});
