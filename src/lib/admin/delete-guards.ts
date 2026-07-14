import type { Schedule } from '@/lib/types';

const ACTIVE_DEPARTURE_STATUSES = new Set<Schedule['status']>(['scheduled', 'paused']);

export function getBusDeletionConflict(busId: string, schedules: Schedule[], today: string): string | undefined {
  const referencingSchedules = schedules.filter((schedule) => schedule.busId === busId);
  const bookedSchedules = referencingSchedules.filter((schedule) => schedule.bookedSeatIds.length > 0);
  if (bookedSchedules.length > 0) {
    return 'This bus has booking history. Archive it instead, or move/cancel the affected bookings before deleting it.';
  }

  const upcomingActiveSchedules = referencingSchedules.filter(
    (schedule) => schedule.date >= today && ACTIVE_DEPARTURE_STATUSES.has(schedule.status),
  );
  if (upcomingActiveSchedules.length > 0) {
    return 'This bus is assigned to upcoming schedules. Delete, cancel, or reassign those schedules first.';
  }

  return undefined;
}
