import Link from 'next/link';
import { ArrowRight, Clock, MapPin } from 'lucide-react';
import { getDb } from '@/lib/db';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDuration, formatTime } from '@/lib/format';
import { buildRouteMetadata } from '@/lib/seo';
import { isPublicRoute } from '@/lib/public-data';

export const metadata = buildRouteMetadata('/routes');

export default async function RoutesPage() {
  const db = getDb();
  const [allRoutes, schedules] = await Promise.all([db.listRoutes(), db.listSchedules()]);
  const routes = allRoutes.filter(isPublicRoute);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Routes & Schedules" subtitle="Browse active routes, departure times, and customer-ready fares." />
      <div className="container-page py-12">
        {routes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-10 text-center">
            <p className="font-semibold text-navy">Routes are being prepared</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Published routes will appear here as soon as the SMG team activates them.
            </p>
            <Link href="/contact" className="mt-5 inline-flex">
              <Button variant="outline">Contact support</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {routes.map((route) => {
              const routeSchedules = schedules.filter((s) => s.routeId === route.id && s.status === 'scheduled');
              const fares = routeSchedules.map((s) => s.fares.standard).filter((fare) => fare > 0);
              const minFare = fares.length ? Math.min(...fares) : 0;
              const maxFare = routeSchedules.length ? Math.max(...routeSchedules.map((s) => s.fares.vip)) : 0;
              const todays = routeSchedules
                .filter((s) => s.date === today)
                .map((s) => s.departureTime)
                .sort();

              return (
                <Card key={route.id} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col p-6">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{route.code}</Badge>
                      {route.popular && <Badge variant="gold">Featured</Badge>}
                    </div>
                    <h2 className="mt-3 flex items-center gap-2 font-heading text-xl font-bold text-navy">
                      {route.origin} <ArrowRight className="size-4 text-gold" /> {route.destination}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="size-4 text-navy" /> {route.distanceKm} km</span>
                      <span className="flex items-center gap-1"><Clock className="size-4 text-navy" /> {formatDuration(route.durationMinutes)}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{route.description}</p>

                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Departures today</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {todays.length ? (
                          todays.map((time) => (
                            <span key={time} className="rounded-md bg-muted px-2 py-1 text-sm font-medium text-navy">
                              {formatTime(time)}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No departures today. Check another date.</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-4 pt-5">
                      <span className="text-sm text-muted-foreground">
                        {minFare > 0 && maxFare > 0 ? `Fares ${formatCurrency(minFare)} - ${formatCurrency(maxFare)}` : 'Fares coming soon'}
                      </span>
                      <Link href={`/book?origin=${encodeURIComponent(route.origin)}&destination=${encodeURIComponent(route.destination)}`}>
                        <Button size="sm">Book route</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
