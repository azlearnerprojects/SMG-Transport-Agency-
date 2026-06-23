import type { Metadata } from 'next';
import { AdminPageTitle } from '@/components/admin/admin-ui';
import { AdminVerify } from '@/components/admin/admin-verify';

export const metadata: Metadata = { title: 'Admin · Ticket Verification' };

export default function AdminVerifyPage() {
  return (
    <>
      <AdminPageTitle title="Ticket Verification" description="Scan a QR code or enter a booking reference to verify a ticket and check passengers in." />
      <AdminVerify />
    </>
  );
}
