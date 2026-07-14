import { LegalContent } from '@/components/layout/legal-content';
import { buildRouteMetadata } from '@/lib/seo';

export const metadata = buildRouteMetadata('/policies/travel');

export default function TravelPolicyPage() {
  return (
    <LegalContent
      title="Travel Policies"
      subtitle="Guidelines to help your journey run smoothly."
      sections={[
        {
          heading: 'Boarding and arrival',
          paragraphs: [
            'Passengers should arrive at the terminal or boarding point at least 30 minutes before the scheduled departure time to allow for ticket verification, luggage handling and boarding.',
            'Buses may depart at the scheduled time. Late arrival may result in missed travel, and missed trips are handled according to the cancellation and refund policy.',
          ],
        },
        {
          heading: 'Tickets and identification',
          paragraphs: [
            'Passengers must present a valid e-ticket, booking reference or QR code on a phone or printed copy before boarding.',
            'SMG may request a valid form of identification where needed to verify the passenger name, booking ownership or eligibility for a special fare.',
          ],
        },
        {
          heading: 'Luggage',
          paragraphs: [
            'Passengers may carry reasonable personal luggage subject to available space and safety requirements. Oversized, commercial or excess luggage may attract an additional fee or may be declined.',
            'Passengers are responsible for securing fragile, valuable or personal items. Dangerous, illegal, flammable or prohibited items are not allowed on board.',
          ],
        },
        {
          heading: 'Conduct and safety',
          paragraphs: [
            'Passengers must follow instructions from SMG staff and drivers, respect other passengers and avoid behaviour that may affect safety or comfort.',
            'Where seat belts are available, passengers should wear them during the journey. Smoking, unlawful substances and disruptive conduct are not permitted.',
          ],
        },
        {
          heading: 'Children and special assistance',
          paragraphs: [
            'Customers travelling with children or passengers who need special assistance should indicate this during booking or contact support before travel so reasonable arrangements can be made.',
          ],
        },
        {
          heading: 'Delays and operational changes',
          paragraphs: [
            'Travel times are estimates and may be affected by traffic, weather, road conditions, security checks or operational needs. SMG will make reasonable efforts to communicate significant changes to affected passengers.',
          ],
        },
      ]}
    />
  );
}
