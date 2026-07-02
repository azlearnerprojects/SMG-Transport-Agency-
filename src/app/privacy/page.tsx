import type { Metadata } from 'next';
import { LegalContent } from '@/components/layout/legal-content';
import { getPublicSiteConfig } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How SMG collects, uses and protects your personal data.',
};

export default async function PrivacyPage() {
  const { config: site } = await getPublicSiteConfig();
  return (
    <LegalContent
      title="Privacy Policy"
      subtitle="How we collect, use, share and protect your personal information."
      sections={[
        {
          heading: 'Information we collect',
          paragraphs: [
            'We collect information you provide when using the platform, including your name, phone number, email address, passenger details, booking details, support messages and any optional identification or emergency contact information supplied during booking.',
            'We may also collect technical information such as device type, browser type, IP address, pages visited, timestamps and basic analytics used to improve reliability and security.',
          ],
        },
        {
          heading: 'How we use information',
          paragraphs: [
            'We use personal information to create and manage bookings, process payments, issue tickets, verify passengers, provide support, send travel updates, prevent fraud and improve the platform.',
            'We may use contact details to send booking confirmations, payment receipts, ticket links, cancellation or rescheduling updates and important service notices.',
          ],
        },
        {
          heading: 'Payments and third-party providers',
          paragraphs: [
            'Payments are handled by secure third-party payment providers. SMG does not store full card numbers, CVV codes or mobile money PINs.',
            'We retain payment references, amounts, statuses and reconciliation details needed for customer support, refunds, audits and operational reporting.',
          ],
        },
        {
          heading: 'Sharing information',
          paragraphs: [
            'We may share necessary information with payment processors, email or SMS providers, hosting providers, customer support tools and operational staff who need the information to deliver the service.',
            'We do not sell personal information. We may disclose information where required by law, regulation, court order or a lawful request from an authorised public body.',
          ],
        },
        {
          heading: 'Data security and retention',
          paragraphs: [
            'We use reasonable technical and organisational measures to protect personal information, including access controls, secure connections and server-side validation.',
            'We retain information for as long as reasonably necessary for bookings, support, accounting, legal compliance, fraud prevention and service improvement.',
          ],
        },
        {
          heading: 'Your choices and rights',
          paragraphs: [
            'You may request access to, correction of or deletion of your personal information, subject to legal, accounting, security and operational requirements.',
            'You may also contact SMG if you believe information linked to your booking or account is inaccurate.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: [
            `Privacy questions can be sent to ${site.supportEmail} or raised through the Contact page.`,
          ],
        },
      ]}
    />
  );
}
