import { describe, it, expect } from 'vitest';
import { calculateFare, isPromotionApplicable, round2 } from '@/lib/fare';
import type { Promotion, FareTable } from '@/lib/types';

const fares: FareTable = { standard: 70, business: 98, vip: 133 };

function promo(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 'p1',
    code: 'EARLYBIRD',
    title: 't',
    description: 'd',
    type: 'percent',
    value: 15,
    active: true,
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-12-31T00:00:00.000Z',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('round2', () => {
  it('rounds to two decimals without float drift', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(70 * 0.15)).toBe(10.5);
  });
});

describe('calculateFare', () => {
  const now = new Date('2026-06-23T08:00:00.000Z');

  it('computes base + fees with no promotion', () => {
    const f = calculateFare({ fares, category: 'standard', seatCount: 2, serviceFeePerSeat: 5, routeId: 'r1', now });
    expect(f.baseFare).toBe(140);
    expect(f.fees).toBe(10);
    expect(f.discount).toBe(0);
    expect(f.total).toBe(150);
  });

  it('applies a percentage promotion to the base fare only', () => {
    const f = calculateFare({ fares, category: 'standard', seatCount: 1, serviceFeePerSeat: 5, promotion: promo(), routeId: 'r1', now });
    expect(f.baseFare).toBe(70);
    expect(f.discount).toBe(10.5); // 15% of 70
    expect(f.total).toBe(64.5); // 70 + 5 - 10.5
  });

  it('caps a flat promotion at the base fare and never goes negative', () => {
    const f = calculateFare({
      fares,
      category: 'standard',
      seatCount: 1,
      serviceFeePerSeat: 5,
      promotion: promo({ type: 'flat', value: 1000 }),
      routeId: 'r1',
      now,
    });
    expect(f.discount).toBe(70); // capped at base
    expect(f.total).toBe(5); // only fees remain
  });
});

describe('isPromotionApplicable', () => {
  const now = new Date('2026-06-23T08:00:00.000Z');

  it('is false when inactive or out of window', () => {
    expect(isPromotionApplicable(promo({ active: false }), { routeId: 'r1', now })).toBe(false);
    expect(isPromotionApplicable(promo({ endsAt: '2026-06-01T00:00:00.000Z' }), { routeId: 'r1', now })).toBe(false);
  });

  it('respects route restrictions', () => {
    expect(isPromotionApplicable(promo({ routeIds: ['r2'] }), { routeId: 'r1', now })).toBe(false);
    expect(isPromotionApplicable(promo({ routeIds: ['r1'] }), { routeId: 'r1', now })).toBe(true);
  });
});
