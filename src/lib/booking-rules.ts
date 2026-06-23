import type { Booking, Schedule, SystemSettings } from './types';
import { round2 } from './fare';

export interface EligibilityResult {
  allowed: boolean;
  reason?: string;
}

/** Hours between `now` and the scheduled departure (can be negative if past). */
export function hoursUntilDeparture(schedule: Schedule, now: Date): number {
  const departure = new Date(`${schedule.date}T${schedule.departureTime}:00`);
  return (departure.getTime() - now.getTime()) / (1000 * 60 * 60);
}

const CANCELLABLE_STATUSES = new Set<Booking['status']>([
  'confirmed',
  'pending_payment',
  'reschedule_requested',
]);

/** Whether a booking may be cancelled given policy + timing. Pure + testable. */
export function canCancel(
  booking: Booking,
  schedule: Schedule,
  settings: SystemSettings,
  now: Date,
): EligibilityResult {
  if (!CANCELLABLE_STATUSES.has(booking.status)) {
    return { allowed: false, reason: `Bookings with status "${booking.status}" cannot be cancelled.` };
  }
  const hrs = hoursUntilDeparture(schedule, now);
  if (hrs < settings.cancellationCutoffHours) {
    return {
      allowed: false,
      reason: `Cancellation closes ${settings.cancellationCutoffHours}h before departure.`,
    };
  }
  return { allowed: true };
}

/** Whether a booking may be rescheduled given policy, timing and reschedule count. */
export function canReschedule(
  booking: Booking,
  schedule: Schedule,
  settings: SystemSettings,
  now: Date,
): EligibilityResult {
  if (booking.status !== 'confirmed') {
    return { allowed: false, reason: 'Only confirmed bookings can be rescheduled.' };
  }
  if (booking.rescheduleCount >= settings.maxReschedules) {
    return {
      allowed: false,
      reason: `This booking has reached the maximum of ${settings.maxReschedules} reschedule(s).`,
    };
  }
  const hrs = hoursUntilDeparture(schedule, now);
  if (hrs < settings.reschedulingCutoffHours) {
    return {
      allowed: false,
      reason: `Rescheduling closes ${settings.reschedulingCutoffHours}h before departure.`,
    };
  }
  return { allowed: true };
}

export interface RefundQuote {
  refundable: boolean;
  cancellationFee: number;
  refundAmount: number;
  note: string;
}

/** Compute the refund a customer would receive if they cancel now. */
export function computeRefund(booking: Booking, settings: SystemSettings): RefundQuote {
  if (settings.nonRefundableFareCategories.includes(booking.fareCategory)) {
    return {
      refundable: false,
      cancellationFee: booking.total,
      refundAmount: 0,
      note: `${booking.fareCategory} fares are non-refundable.`,
    };
  }
  const cancellationFee = round2((booking.total * settings.cancellationFeePercent) / 100);
  const refundAmount = round2(Math.max(0, booking.total - cancellationFee));
  return {
    refundable: true,
    cancellationFee,
    refundAmount,
    note: `A ${settings.cancellationFeePercent}% cancellation fee applies. Refunds take up to ${settings.refundProcessingDays} days.`,
  };
}
