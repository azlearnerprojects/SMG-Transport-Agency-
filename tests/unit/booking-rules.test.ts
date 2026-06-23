import { describe, it, expect } from 'vitest';
import { canCancel, canReschedule, computeRefund, hoursUntilDeparture } from '@/lib/booking-rules';
import type { Booking, Schedule, SystemSettings } from '@/lib/types';

const settings: SystemSettings = {
  cancellationCutoffHours: 6,
  reschedulingCutoffHours: 12,
  cancellationFeePercent: 15,
  maxReschedules: 2,
  refundProcessingDays: 7,
  nonRefundableFareCategories: ['promo'],
  seatHoldTtlSeconds: 600,
};

function schedule(date: string, time: string): Schedule {
  return {
    id: 's1', routeId: 'r1', busId: 'b1', date, departureTime: time, arrivalTime: '12:00',
    status: 'scheduled', fares: { standard: 70, business: 98, vip: 133 }, serviceFee: 5,
    bookedSeatIds: [], createdAt: '', updatedAt: '',
  };
}

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'bk1', reference: 'SMG-TEST', ticketNumber: 'TKT', scheduleId: 's1', routeId: 'r1', busId: 'b1',
    seatIds: ['6A'], seatCategory: 'standard', fareCategory: 'standard',
    passenger: { fullName: 'A', phone: '+233241234567', email: 'a@b.c', idType: 'none' },
    origin: 'Accra', destination: 'Kumasi', boardingPoint: 'Accra Terminal',
    travelDate: '2026-06-25', departureTime: '10:00', arrivalTime: '12:00', busNumber: 'GR-1', busCategory: 'standard',
    baseFare: 70, fees: 5, discount: 0, total: 75, currency: 'GHS',
    status: 'confirmed', paymentStatus: 'successful', rescheduleCount: 0, history: [], createdAt: '', updatedAt: '',
    ...overrides,
  };
}

describe('hoursUntilDeparture', () => {
  it('computes positive hours for a future departure', () => {
    const now = new Date('2026-06-25T07:00:00');
    expect(hoursUntilDeparture(schedule('2026-06-25', '10:00'), now)).toBeCloseTo(3, 1);
  });
});

describe('canCancel', () => {
  it('allows cancellation outside the cut-off', () => {
    const now = new Date('2026-06-25T00:00:00'); // 10h before
    expect(canCancel(booking(), schedule('2026-06-25', '10:00'), settings, now).allowed).toBe(true);
  });
  it('blocks cancellation inside the cut-off', () => {
    const now = new Date('2026-06-25T07:00:00'); // 3h before, cutoff 6h
    expect(canCancel(booking(), schedule('2026-06-25', '10:00'), settings, now).allowed).toBe(false);
  });
  it('blocks cancellation for non-cancellable statuses', () => {
    const now = new Date('2026-06-24T00:00:00');
    expect(canCancel(booking({ status: 'cancelled' }), schedule('2026-06-25', '10:00'), settings, now).allowed).toBe(false);
  });
});

describe('canReschedule', () => {
  it('blocks when max reschedules reached', () => {
    const now = new Date('2026-06-24T00:00:00');
    expect(canReschedule(booking({ rescheduleCount: 2 }), schedule('2026-06-25', '10:00'), settings, now).allowed).toBe(false);
  });
  it('allows when eligible', () => {
    const now = new Date('2026-06-24T00:00:00'); // >12h before
    expect(canReschedule(booking(), schedule('2026-06-25', '10:00'), settings, now).allowed).toBe(true);
  });
});

describe('computeRefund', () => {
  it('applies the cancellation fee percentage', () => {
    const q = computeRefund(booking({ total: 100 }), settings);
    expect(q.refundable).toBe(true);
    expect(q.cancellationFee).toBe(15);
    expect(q.refundAmount).toBe(85);
  });
  it('returns zero refund for non-refundable fare categories', () => {
    const q = computeRefund(booking({ fareCategory: 'promo', total: 100 }), settings);
    expect(q.refundable).toBe(false);
    expect(q.refundAmount).toBe(0);
  });
});
