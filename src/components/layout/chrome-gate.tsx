'use client';

import { usePathname } from 'next/navigation';

/**
 * Renders the public site header/footer for all routes EXCEPT the admin area,
 * which provides its own dashboard chrome. Header/footer are passed as
 * pre-rendered server elements so we keep them as Server Components.
 */
export function ChromeGate({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;
  return (
    <>
      {!isAdmin && header}
      <main id="main" className="flex-1">
        {children}
      </main>
      {!isAdmin && footer}
    </>
  );
}
