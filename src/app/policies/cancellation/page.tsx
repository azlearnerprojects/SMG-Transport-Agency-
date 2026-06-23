import type { Metadata } from 'next';
import { LegalContent } from '@/components/layout/legal-content';
import { DEFAULT_POLICY } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Cancellation & Refund Policy',
  description: 'How SMG cancellations, refunds and rescheduling work.',
};

export default function CancellationPolicyPage() {
  const p = DEFAULT_POLICY;
  return (
    <LegalContent
      title="Cancellation & Refund Policy"
      subtitle="Clear rules for changing or cancelling your trip. Values below are admin-configurable placeholders pending approval."
      sections={[
        {
          heading: 'Cancellations',
          paragraphs: [
            `Bookings may be cancelled up to ${p.cancellationCutoffHours} hours before the scheduled departure time.`,
            `A cancellation fee of ${p.cancellationFeePercent}% of the ticket total applies to eligible refunds.`,
            `Refunds are processed within ${p.refundProcessingDays} working days to your original payment method.`,
          ],
        },
        {
          heading: 'Rescheduling',
          paragraphs: [
            `Confirmed bookings may be rescheduled up to ${p.reschedulingCutoffHours} hours before departure, subject to seat availability on the new trip.`,
            `Each booking may be rescheduled up to ${p.maxReschedules} time(s).`,
          ],
        },
        {
          heading: 'Non-refundable fares',
          paragraphs: [
            `Certain discounted or promotional fares (${p.nonRefundableFareCategories.join(', ') || 'as indicated at booking'}) may be non-refundable. This is shown clearly before you pay.`,
          ],
        },
        {
          heading: 'How to cancel or reschedule',
          paragraphs: [
            'Sign in to your dashboard, or use “Manage Booking” with your reference and contact detail, to request a cancellation or reschedule. Eligibility and any fees are shown before you confirm.',
            'The original booking record is always retained for your reference; a full history of changes is kept.',
          ],
        },
      ]}
      note="These cancellation, rescheduling and refund values are placeholders configured in the admin System Settings and MUST be reviewed and approved by the CEO before launch."
    />
  );
}
