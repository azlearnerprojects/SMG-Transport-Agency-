'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, User } from 'lucide-react';
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

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-semibold text-navy/75 transition-colors hover:bg-navy/5 hover:text-navy',
                pathname.startsWith(item.href) && 'bg-navy/5 text-navy',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <User className="size-4" /> Dashboard
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="outline" size="sm">Profile</Button>
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
            <Button size="sm">Book Trip</Button>
          </Link>
        </div>

        <button
          className="inline-flex size-10 items-center justify-center rounded-md text-navy lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-border bg-white lg:hidden">
          <nav aria-label="Mobile" className="container-page flex flex-col py-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-3 text-base font-medium text-navy hover:bg-navy/5"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link href={user ? '/profile' : '/login'}>
                <Button variant="outline" className="w-full">
                  {user ? 'Profile' : 'Sign in'}
                </Button>
              </Link>
              <Link href="/book">
                <Button className="w-full">Book Trip</Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
