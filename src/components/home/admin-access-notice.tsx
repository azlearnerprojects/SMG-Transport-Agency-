'use client';

import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useCustomerAuth } from '@/lib/auth/customer-auth';

/**
 * A discreet shortcut into the admin area, shown ONLY to a signed-in
 * super_admin. Ordinary visitors never see it, and it carries no internal
 * instructions, debug traces, or development notes — just a link to the console.
 */
export function AdminAccessNotice() {
  const { user } = useCustomerAuth();
  // Ordinary visitors render nothing at all — no wrapper, no spacing.
  if (user?.role !== 'super_admin') return null;

  return (
    <div className="container-page mt-8">
      <aside
        aria-label="Administrator access"
        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-orange-200 bg-orange-50/70 px-4 py-3"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-orange-100 text-orange-700" aria-hidden>
          <ShieldCheck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-navy">Super admin access</p>
          <p className="text-sm text-muted-foreground">
            You are signed in with elevated access. Manage routes, schedules, and site content from the
            admin console.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100"
        >
          Open admin <ArrowRight className="size-4" />
        </Link>
      </aside>
    </div>
  );
}
