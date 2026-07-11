import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '@/lib/data/store';
import { GET } from '@/app/api/schedules/route';
import { getDb } from '@/lib/db';

vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

describe('GET /api/schedules', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('subtracts active seat holds from availableSeats', async () => {
    const store = createStore();
    const schedule = store.listSchedules().at(-1);
    expect(schedule).toBeDefined();

    const before = store.getScheduleView(schedule!.id);
    expect(before).toBeDefined();

    const heldSeatIds = Object.entries(store.seatStatuses(schedule!.id))
      .filter(([, status]) => status === 'available')
      .slice(0, 2)
      .map(([seatId]) => seatId);
    expect(heldSeatIds).toHaveLength(2);

    const hold = store.holdSeats({
      scheduleId: schedule!.id,
      seatIds: heldSeatIds,
      sessionId: 'schedules-route-test',
    });
    expect(hold.ok).toBe(true);

    vi.mocked(getDb).mockReturnValue(store as never);

    const res = await GET(
      new Request(`http://localhost/api/schedules?routeId=${schedule!.routeId}&date=${schedule!.date}`),
    );
    const body = (await res.json()) as {
      data: { schedules: Array<{ scheduleId: string; availableSeats: number }> };
    };
    const item = body.data.schedules.find((entry) => entry.scheduleId === schedule!.id);

    expect(res.status).toBe(200);
    expect(item?.availableSeats).toBe(before!.availableSeats - heldSeatIds.length);
  });
});
