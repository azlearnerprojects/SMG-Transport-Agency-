import { LegalContent } from '@/components/layout/legal-content';
import { DEFAULT_POLICY } from '@/lib/config';
import { buildRouteMetadata } from '@/lib/seo';

export const metadata = buildRouteMetadata('/policies/cancellation');

export default function CancellationPolicyPage() {
  const p = DEFAULT_POLICY;
  return (
    <LegalContent
      title="Cancellation & Refund Policy"
      subtitle="Clear rules for changing or cancelling your trip."
      sections={[
        {
          heading: 'Cancellations',
          paragraphs: [
            `Eligible bookings may be cancelled up to ${p.cancellationCutoffHours} hours before the scheduled departure time.`,
            `Where a refund is approved, a cancellation fee of ${p.cancellationFeePercent}% of the ticket total may apply.`,
            'Cancellation eligibility is shown before you confirm a cancellation request.',
          ],
        },
        {
          heading: 'Refunds',
          paragraphs: [
            `Approved refunds are normally processed within ${p.refundProcessingDays} working days to the original payment method or another approved channel.`,
            'Refund timing may also depend on the payment provider, bank or mobile money operator used for the original transaction.',
          ],
        },
        {
          heading: 'Rescheduling',
          paragraphs: [
            `Confirmed bookings may be rescheduled up to ${p.reschedulingCutoffHours} hours before departure, subject to available seats on the new trip.`,
            `Each booking may be rescheduled up to ${p.maxReschedules} time(s). Fare differences, additional fees or route restrictions may apply.`,
          ],
        },
        {
          heading: 'Non-refundable fares',
          paragraphs: [
            `Certain discounted, promotional or special fares may be non-refundable. Current non-refundable categories include: ${p.nonRefundableFareCategories.join(', ') || 'none configured'}.`,
            'Where a fare is non-refundable, this should be shown before payment or during the change request flow.',
          ],
        },
        {
          heading: 'Missed trips and late arrival',
          paragraphs: [
            'Passengers who miss a trip because they arrived late may not be eligible for a refund. Support may assist with rebooking where seats are available and policy conditions allow.',
          ],
        },
        {
          heading: 'How to request a change',
          paragraphs: [
            'Sign in to your dashboard or use Manage Booking with your booking reference and contact detail to request a cancellation or reschedule.',
            'The platform keeps a history of booking changes, payment updates and refund actions for support and audit purposes.',
          ],
        },
      ]}
      note="Policy values can be updated by an administrator in System Settings before the full launch."
    />
  );
}
