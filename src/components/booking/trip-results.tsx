'use client';

import Link from 'next/link';
import { Clock, Bus, Wifi, Wind, Plug, Coffee, ArmchairIcon, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDuration, formatTime } from '@/lib/format';
import type { BusCategory } from '@/lib/types';

export interface Trip {
  scheduleId: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  busNumber: string;
  busCategory: BusCategory;
  amenities: string[];
  availableSeats: number;
  minFare: number;
}

const AMENITY_ICON: Record<string, typeof Wifi> = {
  'On-board WiFi': Wifi,
  WiFi: Wifi,
  'Air conditioning': Wind,
  'USB charging': Plug,
  Refreshments: Coffee,
  'Reclining seats': ArmchairIcon,
};

export function TripResults({ trips }: { trips: Trip[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        {trips.length} trip{trips.length === 1 ? '' : 's'} found
      </p>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Bus className="size-10 text-muted-foreground" />
            <p className="font-semibold text-navy">No trips available yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              There are no scheduled departures right now. Please check back soon.
            </p>
          </CardContent>
        </Card>
      ) : (
        trips.map((t) => {
          const soldOut = t.availableSeats <= 0;
          return (
            <Card key={t.scheduleId} className="overflow-hidden transition-shadow hover:shadow-card-hover">
              <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="font-heading text-xl font-bold text-navy">
                      {formatTime(t.departureTime)}
                      <ArrowRight className="mx-2 inline size-4 text-gold" />
                      {formatTime(t.arrivalTime)}
                    </div>
                    <Badge variant="outline">
                      <Clock className="mr-1 size-3" /> {formatDuration(t.durationMinutes)}
                    </Badge>
                    <Badge variant={t.busCategory === 'vip' ? 'gold' : t.busCategory === 'business' ? 'navy' : 'muted'}>
                      {t.busCategory.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t.origin} → {t.destination} · Bus {t.busNumber}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {t.amenities.slice(0, 4).map((a) => {
                      const Icon = AMENITY_ICON[a] ?? Bus;
                      return (
                        <span key={a} className="flex items-center gap-1">
                          <Icon className="size-3.5 text-navy" /> {a}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2 border-t border-border pt-4 md:items-end md:border-l md:border-t-0 md:pl-6 md:pt-0">
                  <span className="text-xs text-muted-foreground">from</span>
                  <span className="font-heading text-2xl font-extrabold text-navy">{formatCurrency(t.minFare)}</span>
                  <span className={`text-xs font-medium ${soldOut ? 'text-red-600' : t.availableSeats <= 5 ? 'text-amber-600' : 'text-green-700'}`}>
                    {soldOut ? 'Sold out' : `${t.availableSeats} seats left`}
                  </span>
                  <Link href={`/book/${t.scheduleId}`} aria-disabled={soldOut} className={soldOut ? 'pointer-events-none' : ''}>
                    <Button disabled={soldOut} className="mt-1">Select Trip</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
