import type { Metadata } from 'next';
import { LegalContent } from '@/components/layout/legal-content';

export const metadata: Metadata = { title: 'Privacy Policy', description: 'How SMG collects, uses and protects your personal data.' };

export default function PrivacyPage() {
  return (
    <LegalContent
      title="Privacy Policy"
      subtitle="How we collect, use and protect your personal information."
      sections={[
        {
          heading: 'Information we collect',
          paragraphs: [
            'We collect the information you provide when booking — such as your name, phone number, email, optional ID details and emergency contact — and information about your bookings and payments.',
          ],
        },
        {
          heading: 'How we use your information',
          paragraphs: [
            'We use your information to process bookings and payments, issue tickets, provide customer support, send booking notifications and improve our service.',
            'We do not sell your personal data.',
          ],
        },
        {
          heading: 'Payment data',
          paragraphs: [
            'Payments are handled by our payment provider. We do not store complete card details on our systems; we retain transaction references for reconciliation and support.',
          ],
        },
        {
          heading: 'Data security',
          paragraphs: [
            'We apply reasonable technical and organisational measures to protect your data, including encrypted connections (HTTPS) and access controls. Personally identifiable information is not exposed publicly.',
          ],
        },
        {
          heading: 'Your rights',
          paragraphs: [
            'You may request access to, correction of, or deletion of your personal data, subject to legal and operational requirements. Account holders can edit their profile and request account deletion from the dashboard.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: [
            'For privacy enquiries, contact our support team via the Contact page. (Final data-protection contact details pending approval.)',
          ],
        },
      ]}
    />
  );
}
