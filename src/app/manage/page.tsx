import { PageHeader } from '@/components/layout/page-header';
import { ManageBooking } from '@/components/manage-booking';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata = buildNoIndexMetadata(
  'Manage Booking',
  'Look up your SMG booking to view your ticket, reschedule or cancel.',
);

export default function ManagePage() {
  return (
    <>
      <PageHeader
        title="Manage your booking"
        subtitle="Enter your booking reference and the email or phone you booked with to view, reschedule or cancel your trip."
      />
      <div className="container-page max-w-3xl py-12">
        <ManageBooking />
      </div>
    </>
  );
}
