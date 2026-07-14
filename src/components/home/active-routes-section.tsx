'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, MapPinned, RefreshCw, Route as RouteIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/misc';
import type { HomeRoute } from '@/lib/home-data';
import { RouteCard } from './route-card';
import { RouteCardSkeleton } from './route-card-skeleton';

type Status = 'success' | 'loading' | 'error';

/**
 * Active routes, seeded with the server-rendered list so first paint is instant
 * (no layout shift, SEO-friendly) and no request fires on mount. Loading, empty
 * and error/retry states are all reachable through the refresh/retry action,
 * which re-reads `/api/routes`.
 */
export function ActiveRoutesSection({ initialRoutes }: { initialRoutes: HomeRoute[] }) {
  const [routes, setRoutes] = useState<HomeRoute[]>(initialRoutes);
  const [status, setStatus] = useState<Status>('success');

  const refresh = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await fetch('/api/routes', { cache: 'no-store' });
      const body = (await response.json()) as { ok?: boolean; data?: { routes?: HomeRoute[] } };
      if (!response.ok || !body.ok || !body.data?.routes) {
        throw new Error('Unexpected response');
      }
      setRoutes(body.data.routes);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }, []);

  return (
    <section aria-labelledby="active-routes-heading" className="bg-pagebg py-14 md:py-16">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy text-white"
              aria-hidden
            >
              <RouteIcon className="size-5" />
            </span>
            <div>
              <h2 id="active-routes-heading" className="font-heading text-2xl font-extrabold text-navy md:text-3xl">
                Active SMG routes
              </h2>
              <p className="mt-1 text-sm text-muted-foreground md:text-base">
                Popular routes currently available for booking
              </p>
            </div>
          </div>
          <Link href="/routes" className="shrink-0">
            <Button variant="outline" size="sm">
              View All Routes <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-8">
          {status === 'loading' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <RouteCardSkeleton key={index} />
              ))}
            </div>
          ) : status === 'error' ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-white p-10 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-amber-100 text-amber-700" aria-hidden>
                <AlertTriangle className="size-6" />
              </span>
              <p className="font-semibold text-navy">We couldn&apos;t load routes just now</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Please check your connection and try again.
              </p>
              <Button variant="outline" size="sm" onClick={refresh}>
                <RefreshCw className="size-4" /> Try again
              </Button>
            </div>
          ) : routes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-white p-10 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-navy/5 text-navy" aria-hidden>
                <MapPinned className="size-6" />
              </span>
              <p className="font-semibold text-navy">Routes are being prepared</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                The SMG team is finalising active routes. Check back shortly or refresh to see the latest.
              </p>
              <Button variant="outline" size="sm" onClick={refresh}>
                <RefreshCw className="size-4" /> Check again
              </Button>
            </div>
          ) : (
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
              {routes.map((route, index) => (
                <div
                  key={route.id}
                  className="min-w-[82%] snap-start sm:min-w-0 [@media(min-width:480px)]:min-w-[60%]"
                >
                  <RouteCard route={route} index={index} />
                </div>
              ))}
            </div>
          )}
        </div>

        {status === 'loading' && (
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Refreshing routes…
          </p>
        )}
      </div>
    </section>
  );
}
