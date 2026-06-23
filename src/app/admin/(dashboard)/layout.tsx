import { redirect } from 'next/navigation';
import { getStaffSession } from '@/lib/auth/session';
import { AdminShell } from '@/components/admin/admin-shell';

/**
 * Protected admin layout. The staff session is verified server-side here, so
 * access never depends on hidden links. Unauthenticated users are redirected to
 * the staff sign-in page.
 */
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getStaffSession();
  if (!session) redirect('/admin/login');

  return (
    <AdminShell name={session.name} role={session.role}>
      {children}
    </AdminShell>
  );
}
