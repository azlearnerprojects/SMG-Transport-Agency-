import { Badge } from '@/components/ui/badge';
import type { BookingStatus, PaymentStatus } from '@/lib/types';

const BOOKING_VARIANT: Record<BookingStatus, { variant: 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'navy'; label: string }> = {
  draft: { variant: 'muted', label: 'Draft' },
  seat_held: { variant: 'info', label: 'Seat held' },
  pending_payment: { variant: 'warning', label: 'Pending payment' },
  payment_processing: { variant: 'warning', label: 'Processing' },
  confirmed: { variant: 'success', label: 'Confirmed' },
  checked_in: { variant: 'navy', label: 'Checked in' },
  completed: { variant: 'muted', label: 'Completed' },
  cancel_requested: { variant: 'warning', label: 'Cancel requested' },
  cancelled: { variant: 'danger', label: 'Cancelled' },
  reschedule_requested: { variant: 'warning', label: 'Reschedule requested' },
  rescheduled: { variant: 'info', label: 'Rescheduled' },
  expired: { variant: 'danger', label: 'Expired' },
  payment_failed: { variant: 'danger', label: 'Payment failed' },
  refunded: { variant: 'muted', label: 'Refunded' },
  partially_refunded: { variant: 'muted', label: 'Partly refunded' },
};

const PAYMENT_VARIANT: Record<PaymentStatus, { variant: 'success' | 'warning' | 'danger' | 'muted'; label: string }> = {
  initiated: { variant: 'muted', label: 'Initiated' },
  pending: { variant: 'warning', label: 'Pending' },
  successful: { variant: 'success', label: 'Paid' },
  failed: { variant: 'danger', label: 'Failed' },
  abandoned: { variant: 'danger', label: 'Abandoned' },
  reversed: { variant: 'danger', label: 'Reversed' },
  refunded: { variant: 'muted', label: 'Refunded' },
  partially_refunded: { variant: 'muted', label: 'Partly refunded' },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const s = BOOKING_VARIANT[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const s = PAYMENT_VARIANT[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
