'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useCustomerAuth } from '@/lib/auth/customer-auth';
import { isAdminRole } from '@/lib/auth/roles';
import { Skeleton } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';

export function ProtectedRoute({
  children,
  redirectTo = '/login',
}: {
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { user, loading } = useCustomerAuth();

  useEffect(() => {
    if (!loading && !user) router.replace(redirectTo);
  }, [loading, redirectTo, router, user]);

  if (loading || !user) {
    return (
      <div className="container-page py-12">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}

export function ClientAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useCustomerAuth();

  if (loading) {
    return (
      <div className="container-page py-12">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
    );
  }

  if (!user || !isAdminRole(user.role)) {
    return (
      <div className="container-page grid min-h-[60vh] place-items-center py-12">
        <div className="max-w-md rounded-lg border border-border bg-white p-8 text-center shadow-card">
          <ShieldAlert className="mx-auto size-9 text-gold" />
          <p className="mt-3 font-heading text-xl font-extrabold text-navy">Access denied</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Access denied - this area is for authorized staff only.
          </p>
          <Button className="mt-5" variant="navy" onClick={() => window.location.assign('/login')}>
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
