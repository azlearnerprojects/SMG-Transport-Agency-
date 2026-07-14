import { describe, expect, it } from 'vitest';
import { getBusDeletionConflict } from '@/lib/admin/delete-guards';
import type { Schedule } from '@/lib/types';

function schedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 'schedule-1',
    routeId: 'route-1',
    busId: 'bus-1',
    date: '2026-07-13',
    departureTime: '09:00',
    arrivalTime: '12:00',
    status: 'scheduled',
    fares: { standard: 70, business: 98, vip: 133 },
    serviceFee: 5,
    bookedSeatIds: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('bus deletion guard', () => {
  it('blocks buses assigned to upcoming active schedules', () => {
    const conflict = getBusDeletionConflict('bus-1', [schedule()], '2026-07-13');

    expect(conflict).toMatch(/upcoming schedules/i);
  });

  it('blocks buses with booking history', () => {
    const conflict = getBusDeletionConflict(
      'bus-1',
      [schedule({ date: '2026-01-01', status: 'completed', bookedSeatIds: ['1A'] })],
      '2026-07-13',
    );

    expect(conflict).toMatch(/booking history/i);
  });

  it('allows buses referenced only by old empty schedules', () => {
    const conflict = getBusDeletionConflict(
      'bus-1',
      [
        schedule({ date: '2026-01-01', status: 'completed' }),
        schedule({ id: 'schedule-2', date: '2026-01-02', status: 'departed' }),
      ],
      '2026-07-13',
    );

    expect(conflict).toBeUndefined();
  });

  it('allows buses referenced only by cancelled future schedules without bookings', () => {
    const conflict = getBusDeletionConflict(
      'bus-1',
      [schedule({ date: '2026-08-01', status: 'cancelled' })],
      '2026-07-13',
    );

    expect(conflict).toBeUndefined();
  });
});
