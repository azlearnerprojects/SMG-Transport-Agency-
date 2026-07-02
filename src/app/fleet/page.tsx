import type { Metadata } from 'next';
import Image from 'next/image';
import { CheckCircle2 } from 'lucide-react';
import { getDb } from '@/lib/db';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Our Fleet',
  description: 'Comfortable, well-maintained coaches across Standard, Business and VIP classes.',
};

const TERMINAL_PHOTO = {
  src: '/images/fleet/coach-terminal-sunrise.png',
  alt: 'Modern blue intercity coach at a terminal during sunrise',
  label: 'Terminal ready',
};
const VIP_INTERIOR_PHOTO = {
  src: '/images/fleet/vip-interior.png',
  alt: 'Premium coach interior with blue and warm accent seats',
  label: 'VIP comfort',
};
const CAMPUS_TERMINAL_PHOTO = {
  src: '/images/fleet/campus-terminal-coach.png',
  alt: 'Intercity coach at a campus-area terminal',
  label: 'Campus routes',
};
const LUGGAGE_PHOTO = {
  src: '/images/fleet/luggage-bay.png',
  alt: 'Coach luggage bay prepared for passenger bags',
  label: 'Organised luggage',
};
const HIGHWAY_PHOTO = {
  src: '/images/fleet/ghana-highway-coach.png',
  alt: 'Modern intercity coach travelling on a Ghana highway',
  label: 'On the road',
};

const FLEET_PHOTOS = [TERMINAL_PHOTO, VIP_INTERIOR_PHOTO, CAMPUS_TERMINAL_PHOTO, LUGGAGE_PHOTO, HIGHWAY_PHOTO];

const BUS_PHOTO_BY_ID: Record<string, string> = {
  bus_express1: TERMINAL_PHOTO.src,
  bus_express2: CAMPUS_TERMINAL_PHOTO.src,
  bus_business1: LUGGAGE_PHOTO.src,
  bus_vip1: VIP_INTERIOR_PHOTO.src,
};

export default async function FleetPage() {
  const db = getDb();
  const buses = (await db.listBuses()).filter((b) => b.status !== 'archived');

  return (
    <>
      <PageHeader
        title="Our Fleet"
        subtitle="Comfortable, well-maintained coaches across Standard, Business and VIP classes."
      />
      <div className="container-page py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {FLEET_PHOTOS.map((photo, index) => (
            <div
              key={photo.src}
              className="relative h-44 overflow-hidden rounded-lg"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
                priority={index < 5}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/80 to-transparent p-3">
                <p className="text-sm font-semibold text-white">{photo.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {buses.map((bus) => (
            <Card key={bus.id} className="overflow-hidden">
              <div className="relative h-48 bg-cloud">
                <Image
                  src={BUS_PHOTO_BY_ID[bus.id] ?? HIGHWAY_PHOTO.src}
                  alt={`${bus.name} fleet photo`}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-heading text-lg font-bold text-navy">{bus.name}</h2>
                  <Badge variant={bus.category === 'vip' ? 'gold' : bus.category === 'business' ? 'navy' : 'muted'}>
                    {bus.category.toUpperCase()}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bus {bus.busNumber} - {bus.capacity} seats
                </p>
                <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-navy/80">
                  {bus.amenities.map((a) => (
                    <li key={a} className="flex items-center gap-1.5">
                      <CheckCircle2 className="size-4 text-gold" /> {a}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
