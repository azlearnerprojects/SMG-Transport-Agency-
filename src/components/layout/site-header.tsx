'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, Bell, Menu, User, X } from 'lucide-react';
import { Logo } from './logo';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/lib/auth/customer-auth';
import { cn } from '@/lib/utils';

// Keep the top nav to the core customer journey; Deals and Contact stay
// reachable from the homepage sections and the footer.
const NAV = [
  { href: '/book', label: 'Book' },
  { href: '/routes', label: 'Routes' },
  { href: '/manage', label: 'Manage' },
  { href: '/faq', label: 'Help' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user } = useCustomerAuth();

  // Close the mobile menu on navigation.
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container-page flex h-[72px] items-center justify-between gap-4 lg:h-20">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-semibold text-navy/75 transition-colors hover:bg-navy/5 hover:text-navy',
                isActive(item.href) && 'bg-navy/5 text-navy',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <Link
                href="/dashboard"
                aria-label="Your dashboard notifications"
                className="grid size-10 place-items-center rounded-full text-navy transition-colors hover:bg-navy/5"
              >
                <Bell className="size-5" />
              </Link>
              <span aria-hidden className="mx-1 h-6 w-px bg-border" />
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <User className="size-4" /> Dashboard
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="outline" size="sm">
                  Profile
                </Button>
              </Link>
            </>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="sm">
                <User className="size-4" /> Sign in
              </Button>
            </Link>
          )}
          <Link href="/book">
            <Button variant="cta" size="sm">
              Book Trip <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>

        <button
          className="inline-flex size-11 items-center justify-center rounded-md text-navy hover:bg-navy/5 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="animate-in fade-in slide-in-from-top-1 border-t border-border bg-white duration-200 lg:hidden"
        >
          <nav aria-label="Mobile" className="container-page flex flex-col py-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-3 text-base font-medium text-navy hover:bg-navy/5',
                  isActive(item.href) && 'bg-navy/5',
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link href={user ? '/dashboard' : '/login'}>
                <Button variant="outline" className="w-full">
                  {user ? 'Dashboard' : 'Sign in'}
                </Button>
              </Link>
              <Link href="/book">
                <Button variant="cta" className="w-full">
                  Book Trip
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
