'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, LogOut, ExternalLink } from 'lucide-react';
import { ADMIN_NAV } from '@/lib/admin-nav';
import { Logo } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StaffRole } from '@/lib/types';

const ROLE_LABEL: Record<StaffRole, string> = {
  super_admin: 'Super Administrator',
  operations_manager: 'Operations Manager',
  booking_officer: 'Booking Officer',
  customer_support: 'Customer Support',
  finance_officer: 'Finance Officer',
  content_editor: 'Content Editor',
  ticket_inspector: 'Ticket Inspector',
};

export function AdminShell({
  name,
  role,
  children,
}: {
  name: string;
  role: StaffRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Server-side role checks remain authoritative; this only hides irrelevant links.
  const visible = ADMIN_NAV.filter((item) => role === 'super_admin' || item.roles.includes(role) || item.href === '/admin');

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => undefined);
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-cloud">
      {/* Topbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-navy px-4 text-white">
        <div className="flex items-center gap-3">
          <button className="lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
            {open ? <X /> : <Menu />}
          </button>
          <div className="rounded-md bg-white/95 p-1">
            <Logo compact />
          </div>
          <span className="hidden font-heading font-bold sm:block">Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-tight">{name}</p>
            <p className="text-xs text-white/70">{ROLE_LABEL[role]}</p>
          </div>
          <Link href="/" target="_blank" className="hidden text-white/80 hover:text-white sm:block" aria-label="Open public site">
            <ExternalLink className="size-5" />
          </Link>
          <Button size="sm" variant="primary" onClick={logout}>
            <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-16 left-0 z-20 w-64 overflow-y-auto border-r border-border bg-white p-3 transition-transform lg:static lg:inset-auto lg:translate-x-0',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <nav className="space-y-1">
            {visible.map((item) => {
              const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-navy text-white' : 'text-navy hover:bg-navy/5',
                  )}
                >
                  <item.icon className="size-4" /> {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 px-3">
            <Badge variant="muted" className="text-[10px]">Role: {ROLE_LABEL[role]}</Badge>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
