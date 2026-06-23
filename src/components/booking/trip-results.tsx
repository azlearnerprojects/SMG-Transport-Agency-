'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Clock, Bus, Wifi, Wind, Plug, Coffee, ArmchairIcon, ArrowRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/misc';
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

function window(time: string): 'morning' | 'afternoon' | 'evening' {
  const h = Number(time.slice(0, 2));
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export function TripResults({ trips }: { trips: Trip[] }) {
  const [busType, setBusType] = useState<'any' | BusCategory>('any');
  const [timeWindow, setTimeWindow] = useState<'any' | 'morning' | 'afternoon' | 'evening'>('any');
  const [sort, setSort] = useState<'departure' | 'price'>('departure');
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const maxFare = trips.length ? Math.max(...trips.map((t) => t.minFare)) : 0;
  const [priceCeiling, setPriceCeiling] = useState(maxFare);

  const filtered = useMemo(() => {
    const list = trips.filter((t) => {
      if (busType !== 'any' && t.busCategory !== busType) return false;
      if (timeWindow !== 'any' && window(t.departureTime) !== timeWindow) return false;
      if (onlyAvailable && t.availableSeats <= 0) return false;
      if (t.minFare > priceCeiling) return false;
      return true;
    });
    return list.sort((a, b) =>
      sort === 'price' ? a.minFare - b.minFare : a.departureTime.localeCompare(b.departureTime),
    );
  }, [trips, busType, timeWindow, onlyAvailable, priceCeiling, sort]);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Filters */}
      <aside className="space-y-5 rounded-lg border border-border bg-white p-5 lg:sticky lg:top-20 lg:self-start">
        <div className="flex items-center gap-2 font-heading font-bold text-navy">
          <Filter className="size-4" /> Filters
        </div>
        <div className="space-y-1.5">
          <label htmlFor="f-bus" className="text-sm font-medium text-navy">Bus type</label>
          <Select id="f-bus" value={busType} onChange={(e) => setBusType(e.target.value as typeof busType)}>
            <option value="any">Any</option>
            <option value="standard">Standard</option>
            <option value="business">Business</option>
            <option value="vip">VIP Executive</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="f-time" className="text-sm font-medium text-navy">Departure time</label>
          <Select id="f-time" value={timeWindow} onChange={(e) => setTimeWindow(e.target.value as typeof timeWindow)}>
            <option value="any">Any time</option>
            <option value="morning">Morning (before 12:00)</option>
            <option value="afternoon">Afternoon (12:00–17:00)</option>
            <option value="evening">Evening (after 17:00)</option>
          </Select>
        </div>
        {maxFare > 0 && (
          <div className="space-y-1.5">
            <label htmlFor="f-price" className="text-sm font-medium text-navy">
              Max fare: {formatCurrency(priceCeiling)}
            </label>
            <input
              id="f-price"
              type="range"
              min={0}
              max={maxFare}
              step={5}
              value={priceCeiling}
              onChange={(e) => setPriceCeiling(Number(e.target.value))}
              className="w-full accent-gold"
            />
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-navy">
          <Checkbox checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
          Only show available
        </label>
        <div className="space-y-1.5">
          <label htmlFor="f-sort" className="text-sm font-medium text-navy">Sort by</label>
          <Select id="f-sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="departure">Earliest departure</option>
            <option value="price">Lowest price</option>
          </Select>
        </div>
      </aside>

      {/* Results */}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {filtered.length} trip{filtered.length === 1 ? '' : 's'} found
        </p>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Bus className="size-10 text-muted-foreground" />
              <p className="font-semibold text-navy">No trips match your filters</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Try widening your filters, choosing another date, or checking a nearby route.
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((t) => {
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
    </div>
  );
}
