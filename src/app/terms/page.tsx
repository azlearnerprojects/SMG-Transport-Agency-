import type { Metadata } from 'next';
import { LegalContent } from '@/components/layout/legal-content';
import { BRAND } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Terms governing use of the SMG booking platform.',
};

export default function TermsPage() {
  return (
    <LegalContent
      title="Terms & Conditions"
      subtitle="The terms that govern your use of the SMG Transport Agency website and booking platform."
      sections={[
        {
          heading: '1. Acceptance of terms',
          paragraphs: [
            'By using this website, creating an account, making a booking or contacting SMG Transport Agency through the platform, you agree to these Terms & Conditions, the Privacy Policy and any travel, cancellation or refund rules shown during booking.',
            'If you do not agree with these terms, you should not use the booking platform.',
          ],
        },
        {
          heading: '2. Booking and ticket confirmation',
          paragraphs: [
            'A booking is confirmed only when payment has been successfully verified and an e-ticket or booking reference has been issued by the platform.',
            'Passengers are responsible for providing accurate names, phone numbers, email addresses, travel dates and passenger details. SMG may refuse boarding where the ticket information cannot be verified.',
          ],
        },
        {
          heading: '3. Fares, fees and payments',
          paragraphs: [
            'All fares are displayed in Ghana Cedis unless otherwise stated. The total shown before payment may include base fare, service fees, discounts and other charges that apply to the selected trip.',
            'Payments are processed by third-party payment providers. SMG does not store full card details or mobile money PINs. A transaction may be reviewed or reversed where fraud, chargeback, duplicate payment or technical error is suspected.',
          ],
        },
        {
          heading: '4. Passenger conduct and boarding',
          paragraphs: [
            'Passengers must arrive on time, present a valid ticket and follow reasonable instructions from SMG staff, terminal staff and drivers.',
            'SMG may refuse service to any passenger whose conduct creates a safety risk, disrupts other passengers or violates applicable law or terminal rules.',
          ],
        },
        {
          heading: '5. Schedule changes and service interruptions',
          paragraphs: [
            'SMG aims to operate according to published schedules, but departure and arrival times may be affected by traffic, weather, road conditions, safety checks, vehicle availability or other operational factors.',
            'Where SMG cancels or materially changes a trip, affected passengers may be offered a reschedule, travel credit or refund according to the applicable policy and circumstances.',
          ],
        },
        {
          heading: '6. Account security',
          paragraphs: [
            'Customers are responsible for keeping account access secure and for notifying SMG if they believe their account or booking information has been used without permission.',
          ],
        },
        {
          heading: '7. Limitation of liability',
          paragraphs: [
            'To the extent permitted by law, SMG is not liable for indirect, incidental or consequential losses arising from use of the platform, delays, interruptions or third-party service failures.',
            'Nothing in these terms limits rights or remedies that cannot legally be excluded under applicable law.',
          ],
        },
        {
          heading: '8. Contact',
          paragraphs: [
            `Questions about these terms can be sent to ${BRAND.email} or raised through the Contact page.`,
          ],
        },
      ]}
    />
  );
}
