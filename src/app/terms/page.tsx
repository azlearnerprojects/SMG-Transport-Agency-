import type { Metadata } from 'next';
import { LegalContent } from '@/components/layout/legal-content';

export const metadata: Metadata = { title: 'Terms & Conditions', description: 'Terms governing use of the SMG booking platform.' };

export default function TermsPage() {
  return (
    <LegalContent
      title="Terms & Conditions"
      subtitle="The terms that govern your use of the SMG Transport Agency booking platform."
      sections={[
        {
          heading: '1. Agreement',
          paragraphs: [
            'By booking a ticket or using this website, you agree to these Terms & Conditions, our Privacy Policy and our Cancellation & Refund Policy.',
          ],
        },
        {
          heading: '2. Bookings & tickets',
          paragraphs: [
            'A booking is only confirmed once payment has been successfully verified and an e-ticket has been issued.',
            'You are responsible for providing accurate passenger and contact information. Tickets are valid only for the trip, date and seat indicated.',
          ],
        },
        {
          heading: '3. Payments',
          paragraphs: [
            'Payments are processed by third-party payment providers. SMG does not store full card details. All fares are quoted in Ghana Cedis (GHS).',
          ],
        },
        {
          heading: '4. Changes & delays',
          paragraphs: [
            'While we aim to depart and arrive on schedule, times are estimates and may be affected by traffic, weather or operational needs. SMG may amend or cancel a trip; where a trip is cancelled by SMG, affected passengers will be offered a reschedule or refund.',
          ],
        },
        {
          heading: '5. Liability',
          paragraphs: [
            'To the extent permitted by law, SMG’s liability is limited as set out in these terms. Nothing in these terms excludes liability that cannot be excluded under Ghanaian law.',
          ],
        },
        {
          heading: '6. Contact',
          paragraphs: [
            'Questions about these terms can be directed to our support team via the Contact page. (Final contact details pending approval.)',
          ],
        },
      ]}
    />
  );
}
