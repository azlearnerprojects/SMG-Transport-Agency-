import { describe, it, expect, vi, afterEach } from 'vitest';
import { createStore } from '@/lib/data/store';
import type { PassengerDetails } from '@/lib/types';

const passenger: PassengerDetails = {
  fullName: 'Test Passenger',
  phone: '+233241234567',
  email: 'test@example.com',
  idType: 'none',
};

/** A schedule with no pre-seeded bookings (samples only touch the first few). */
function freshSchedule(store: ReturnType<typeof createStore>) {
  const all = store.listSchedules();
  return all[all.length - 1]!;
}

afterEach(() => vi.useRealTimers());

describe('seat holds', () => {
  it('prevents two sessions holding the same seat (no double-booking)', () => {
    const store = createStore();
    const sch = freshSchedule(store);
    const first = store.holdSeats({ scheduleId: sch.id, seatIds: ['6A'], sessionId: 's1' });
    expect(first.ok).toBe(true);

    const second = store.holdSeats({ scheduleId: sch.id, seatIds: ['6A'], sessionId: 's2' });
    expect(second.ok).toBe(false);
    expect(second.conflictSeats).toContain('6A');
  });

  it('lets the same session re-hold its own seats (idempotent reselection)', () => {
    const store = createStore();
    const sch = freshSchedule(store);
    expect(store.holdSeats({ scheduleId: sch.id, seatIds: ['6A'], sessionId: 's1' }).ok).toBe(true);
    expect(store.holdSeats({ scheduleId: sch.id, seatIds: ['6A', '6B'], sessionId: 's1' }).ok).toBe(true);
  });

  it('releases the seat after the hold expires', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-23T08:00:00Z'));
    const store = createStore();
    store.updateSettings({ seatHoldTtlSeconds: 60 });
    const sch = freshSchedule(store);

    expect(store.holdSeats({ scheduleId: sch.id, seatIds: ['6A'], sessionId: 's1' }).ok).toBe(true);
    expect(store.holdSeats({ scheduleId: sch.id, seatIds: ['6A'], sessionId: 's2' }).ok).toBe(false);

    vi.setSystemTime(new Date('2026-06-23T08:02:00Z')); // +2 min, past the 60s TTL
    expect(store.holdSeats({ scheduleId: sch.id, seatIds: ['6A'], sessionId: 's2' }).ok).toBe(true);
  });
});

describe('booking lifecycle', () => {
  it('computes the correct total and confirms idempotently', () => {
    const store = createStore();
    const sch = freshSchedule(store);
    const view = store.getScheduleView(sch.id)!;

    const hold = store.holdSeats({ scheduleId: sch.id, seatIds: ['6A', '6B'], sessionId: 's1' });
    expect(hold.ok).toBe(true);

    const created = store.createBooking({
      scheduleId: sch.id,
      seatIds: ['6A', '6B'],
      seatCategory: 'standard',
      passenger,
      holdId: hold.hold!.id,
      sessionId: 's1',
    });
    expect(created.ok).toBe(true);
    const booking = created.booking!;
    const expectedBase = view.schedule.fares.standard * 2;
    expect(booking.baseFare).toBe(expectedBase);
    expect(booking.fees).toBe(view.schedule.serviceFee * 2);
    expect(booking.total).toBe(expectedBase + view.schedule.serviceFee * 2);
    expect(booking.status).toBe('pending_payment');

    store.recordPaymentInit({ bookingReference: booking.reference, provider: 'mock', method: 'mobile_money', providerReference: 'MOCK-1' });
    const confirmed = store.confirmPayment({ providerReference: 'MOCK-1', bookingReference: booking.reference });
    expect(confirmed.ok).toBe(true);
    expect(confirmed.booking!.status).toBe('confirmed');
    expect(confirmed.booking!.ticketNumber).not.toBe('');

    // Seats are now permanently booked.
    const after = store.getScheduleView(sch.id)!;
    expect(after.schedule.bookedSeatIds).toEqual(expect.arrayContaining(['6A', '6B']));

    // Confirming again is a no-op returning the same booking.
    const again = store.confirmPayment({ providerReference: 'MOCK-1', bookingReference: booking.reference });
    expect(again.ok).toBe(true);
    expect(again.booking!.reference).toBe(booking.reference);

    // A different session can no longer take those seats.
    expect(store.holdSeats({ scheduleId: sch.id, seatIds: ['6A'], sessionId: 's2' }).ok).toBe(false);
  });

  it('fails a booking when the hold has expired', () => {
    const store = createStore();
    const sch = freshSchedule(store);
    const hold = store.holdSeats({ scheduleId: sch.id, seatIds: ['6A'], sessionId: 's1' });
    store.releaseHold(hold.hold!.id);
    const created = store.createBooking({
      scheduleId: sch.id,
      seatIds: ['6A'],
      seatCategory: 'standard',
      passenger,
      holdId: hold.hold!.id,
      sessionId: 's1',
    });
    expect(created.ok).toBe(false);
  });
});

describe('lookup & cancellation', () => {
  function makeConfirmed(store: ReturnType<typeof createStore>) {
    const sch = freshSchedule(store);
    const hold = store.holdSeats({ scheduleId: sch.id, seatIds: ['6A'], sessionId: 's1' });
    const booking = store.createBooking({
      scheduleId: sch.id, seatIds: ['6A'], seatCategory: 'standard', passenger, holdId: hold.hold!.id, sessionId: 's1',
    }).booking!;
    store.recordPaymentInit({ bookingReference: booking.reference, provider: 'mock', method: 'card', providerReference: `MOCK-${booking.reference}` });
    store.confirmPayment({ providerReference: `MOCK-${booking.reference}`, bookingReference: booking.reference });
    return store.getBookingByReference(booking.reference)!;
  }

  it('looks up a booking by reference and matching contact only', () => {
    const store = createStore();
    const b = makeConfirmed(store);
    expect(store.lookupBooking(b.reference, 'test@example.com')).toBeTruthy();
    expect(store.lookupBooking(b.reference, '+233241234567')).toBeTruthy();
    expect(store.lookupBooking(b.reference, 'wrong@example.com')).toBeUndefined();
  });

  it('cancels a confirmed booking, frees the seat and keeps the record', () => {
    const store = createStore();
    const b = makeConfirmed(store);
    const result = store.cancelBooking(b.reference);
    expect(result.ok).toBe(true);
    expect(result.booking!.status).toBe('cancelled');
    expect(result.refund!.refundAmount).toBeGreaterThanOrEqual(0);
    // Seat is freed.
    expect(store.holdSeats({ scheduleId: b.scheduleId, seatIds: ['6A'], sessionId: 's3' }).ok).toBe(true);
    // Original record is retained.
    expect(store.getBookingByReference(b.reference)).toBeTruthy();
  });
});

describe('search', () => {
  it('returns schedules for a known route and date', () => {
    const store = createStore();
    const routes = store.listRoutes();
    const route = routes[0]!;
    const today = new Date().toISOString().slice(0, 10);
    const results = store.searchSchedules({ origin: route.origin, destination: route.destination, date: today });
    expect(Array.isArray(results)).toBe(true);
    for (const r of results) {
      expect(r.route.origin).toBe(route.origin);
      expect(r.route.destination).toBe(route.destination);
    }
  });
});
