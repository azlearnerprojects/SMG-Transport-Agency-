import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { AdminPageTitle, DataTable, type Column } from '@/components/admin/admin-ui';
import { Badge } from '@/components/ui/badge';
import type { AppUser } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin · Customers' };

export default function AdminCustomers() {
  const db = getDb();
  const customers = db.listCustomers();
  const bookings = db.listBookings();

  const cols: Column<AppUser>[] = [
    { key: 'fullName', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'verified', header: 'Verified', render: (u) => <Badge variant={u.emailVerified ? 'success' : 'muted'}>{u.emailVerified ? 'Yes' : 'No'}</Badge> },
    { key: 'bookings', header: 'Bookings', render: (u) => bookings.filter((b) => b.customerId === u.id).length },
  ];

  return (
    <>
      <AdminPageTitle title="Customers" description={`${customers.length} registered customers (demo data). Guest bookings are tracked by contact detail.`} />
      <DataTable columns={cols} rows={customers} empty="No customers yet." />
    </>
  );
}
