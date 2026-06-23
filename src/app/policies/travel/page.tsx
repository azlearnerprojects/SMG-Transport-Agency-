import type { Metadata } from 'next';
import { LegalContent } from '@/components/layout/legal-content';

export const metadata: Metadata = { title: 'Travel Policies', description: 'SMG travel, luggage and boarding policies.' };

export default function TravelPolicyPage() {
  return (
    <LegalContent
      title="Travel Policies"
      subtitle="Guidelines to help your journey run smoothly. (Placeholder content pending approval.)"
      sections={[
        {
          heading: 'Boarding & arrival',
          paragraphs: [
            'Passengers should arrive at the terminal at least 30 minutes before the scheduled departure time to allow for ticket verification and boarding.',
            'Buses depart on schedule. SMG cannot guarantee boarding for passengers who arrive after the bus has departed.',
          ],
        },
        {
          heading: 'Tickets & identification',
          paragraphs: [
            'A valid e-ticket (QR code, on a phone or printed) must be presented at boarding.',
            'Passengers may be asked to show a valid ID matching the name on the ticket.',
          ],
        },
        {
          heading: 'Luggage',
          paragraphs: [
            'Each passenger is entitled to a reasonable luggage allowance. Oversized or excess luggage may attract an additional fee or be declined where space is limited. (Final allowance values pending approval.)',
            'Dangerous, illegal or prohibited items may not be carried on board.',
          ],
        },
        {
          heading: 'Conduct & safety',
          paragraphs: [
            'For everyone’s safety, passengers must follow the instructions of SMG staff and drivers at all times.',
            'Seat belts, where fitted, should be worn for the duration of the journey.',
          ],
        },
        {
          heading: 'Children & special assistance',
          paragraphs: [
            'Please note any special assistance needs during booking so our team can prepare. We aim to make travel accessible to all passengers.',
          ],
        },
      ]}
    />
  );
}
