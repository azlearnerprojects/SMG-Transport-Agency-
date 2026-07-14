'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, LogOut, ExternalLink } from 'lucide-react';
import { activeSection, visibleChildren, visibleSections } from '@/lib/admin-nav';
import { Logo } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';
import type { StaffRole } from '@/lib/types';

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
  const sections = visibleSections(role);
  const current = activeSection(pathname);
  const subTabs = current ? visibleChildren(current, role) : [];

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => undefined);
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-cloud">
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
            <p className="text-xs text-white/70">{ROLE_LABELS[role]}</p>
          </div>
          <Link href="/" target="_blank" className="hidden text-white/80 hover:text-white sm:block" aria-label="Open public site">
            <ExternalLink className="size-5" />
          </Link>
          <Button size="sm" variant="primary" onClick={logout}>
            <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar — scrolls independently of the page content on desktop */}
        <aside
          className={cn(
            // Mobile: off-canvas drawer pinned below the 64px header (inset-y-16 sets top+bottom).
            'fixed inset-y-16 left-0 z-20 w-64 shrink-0 overflow-y-auto border-r border-border bg-white p-3 transition-transform',
            // Desktop: sticky column that keeps top:4rem (from inset-y-16) and scrolls independently.
            'lg:sticky lg:bottom-auto lg:left-auto lg:h-[calc(100vh-4rem)] lg:translate-x-0',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <nav className="space-y-1">
            {sections.map((section) => {
              const active = current?.href === section.href;
              return (
                <Link
                  key={section.href}
                  href={section.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'bg-navy text-white' : 'text-navy hover:bg-navy/5',
                  )}
                >
                  <section.icon className="size-4" /> {section.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 px-3">
            <Badge variant="muted" className="text-[10px]">Role: {ROLE_LABELS[role]}</Badge>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          {subTabs.length > 1 && (
            <div className="sticky top-16 z-10 border-b border-border bg-cloud/95 backdrop-blur">
              <nav className="flex gap-1 overflow-x-auto px-4 py-2 sm:px-6">
                {subTabs.map((tab) => {
                  const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      className={cn(
                        'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        active ? 'bg-navy text-white' : 'text-navy hover:bg-navy/10',
                      )}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
          <div className="p-4 sm:p-6">{children}</div>
        </main>
      </div>

      {/* Backdrop for the mobile drawer */}
      {open && <div className="fixed inset-0 top-16 z-10 bg-navy/40 lg:hidden" onClick={() => setOpen(false)} />}
    </div>
  );
}
