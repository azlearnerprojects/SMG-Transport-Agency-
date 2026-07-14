import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { formatCurrency, formatDuration } from '@/lib/format';
import type { HomeRoute } from '@/lib/home-data';

/**
 * Coach photography reused as route thumbnails. Assigned deterministically by
 * index so the grid looks varied but never shifts between renders.
 */
const ROUTE_IMAGES = [
  '/images/fleet/ghana-highway-coach.png',
  '/images/fleet/coach-terminal-sunrise.png',
  '/images/fleet/campus-terminal-coach.png',
  '/images/fleet/vip-interior.png',
] as const;

export function routeImageFor(index: number): string {
  return ROUTE_IMAGES[index % ROUTE_IMAGES.length]!;
}

export function RouteCard({ route, index = 0 }: { route: HomeRoute; index?: number }) {
  const href = `/book?origin=${encodeURIComponent(route.origin)}&destination=${encodeURIComponent(
    route.destination,
  )}`;

  return (
    <Link
      href={href}
      aria-label={`View trips from ${route.origin} to ${route.destination}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-card transition-shadow hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2"
    >
      <div className="relative h-36 w-full overflow-hidden bg-cloud">
        <Image
          src={routeImageFor(index)}
          alt={`SMG coach serving the ${route.origin} to ${route.destination} route`}
          fill
          loading="lazy"
          sizes="(max-width: 640px) 85vw, (max-width: 1024px) 45vw, 300px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="flex flex-wrap items-center gap-x-1.5 font-heading text-base font-bold text-navy">
          <span>{route.origin}</span>
          <ArrowRight className="size-4 shrink-0 text-orange-500" aria-hidden />
          <span className="sr-only">to</span>
          <span>{route.destination}</span>
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden /> {formatDuration(route.durationMinutes)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden /> {route.distanceKm} km
          </span>
        </div>

        <div className="mt-3">
          {route.available ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
              <CheckCircle2 className="size-3.5" aria-hidden /> Available
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              Departures soon
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="text-xs text-muted-foreground">From</p>
            <p className="font-heading text-lg font-extrabold text-navy">
              {route.startingFare > 0 ? formatCurrency(route.startingFare) : '—'}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-orange px-3 py-2 text-sm font-semibold text-white transition-colors group-hover:bg-orange-600">
            View Trips <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
