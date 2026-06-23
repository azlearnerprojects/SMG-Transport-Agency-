import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { ManageBooking } from '@/components/manage-booking';

export const metadata: Metadata = {
  title: 'Manage Booking',
  description: 'Look up your SMG booking to view your ticket, reschedule or cancel.',
};

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
