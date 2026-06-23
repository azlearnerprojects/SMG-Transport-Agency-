'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, User } from 'lucide-react';
import { Logo } from './logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/book', label: 'Book a Trip' },
  { href: '/routes', label: 'Routes & Schedules' },
  { href: '/fleet', label: 'Our Fleet' },
  { href: '/promotions', label: 'Promotions' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu on navigation.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium text-navy/80 transition-colors hover:bg-navy/5 hover:text-navy',
                pathname.startsWith(item.href) && 'text-navy font-semibold',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              <User className="size-4" /> Sign in
            </Button>
          </Link>
          <Link href="/book">
            <Button size="sm">Book Now</Button>
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
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Sign in
                </Button>
              </Link>
              <Link href="/book">
                <Button className="w-full">Book Now</Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
