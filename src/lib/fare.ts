import type { Promotion, SeatCategory, FareTable } from './types';

export interface FareBreakdown {
  baseFare: number;
  fees: number;
  discount: number;
  total: number;
}

/** Round to 2 decimal places, avoiding binary float drift. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Determine whether a promotion can be applied to a given route on a given date.
 * Pure function — `now` is injected so it is deterministic and unit-testable.
 */
export function isPromotionApplicable(
  promo: Promotion | undefined,
  ctx: { routeId: string; now: Date },
): boolean {
  if (!promo || !promo.active) return false;
  const start = new Date(promo.startsAt).getTime();
  const end = new Date(promo.endsAt).getTime();
  const t = ctx.now.getTime();
  if (t < start || t > end) return false;
  if (promo.routeIds && promo.routeIds.length > 0 && !promo.routeIds.includes(ctx.routeId)) {
    return false;
  }
  return true;
}

/**
 * Compute the full fare breakdown for a booking.
 * Fees are charged per seat; the discount applies to the base fare only and can
 * never push the total below zero.
 */
export function calculateFare(params: {
  fares: FareTable;
  category: SeatCategory;
  seatCount: number;
  serviceFeePerSeat: number;
  promotion?: Promotion;
  routeId: string;
  now: Date;
}): FareBreakdown {
  const unit = params.fares[params.category];
  const baseFare = round2(unit * params.seatCount);
  const fees = round2(params.serviceFeePerSeat * params.seatCount);

  let discount = 0;
  if (isPromotionApplicable(params.promotion, { routeId: params.routeId, now: params.now })) {
    const p = params.promotion!;
    discount =
      p.type === 'percent'
        ? round2((baseFare * p.value) / 100)
        : round2(Math.min(p.value, baseFare));
  }

  const total = round2(Math.max(0, baseFare + fees - discount));
  return { baseFare, fees, discount, total };
}
