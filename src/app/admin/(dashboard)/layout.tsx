import { redirect } from 'next/navigation';
import { canAccessAdmin, getStaffSession } from '@/lib/auth/session';
import { AdminShell } from '@/components/admin/admin-shell';

/**
 * Protected admin layout. The staff session is verified server-side here, so
 * access never depends on hidden links. Unauthenticated users are redirected to
 * the staff sign-in page.
 */
export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getStaffSession();
  if (!session) redirect('/admin/login');
  if (!canAccessAdmin(session)) {
    return (
      <div className="grid min-h-screen place-items-center bg-cloud p-6">
        <div className="max-w-md rounded-lg border border-border bg-white p-8 text-center shadow-card">
          <p className="font-heading text-xl font-extrabold text-navy">Access denied</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Access denied - this area is for authorized staff only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminShell name={session.name} role={session.role}>
      {children}
    </AdminShell>
  );
}
