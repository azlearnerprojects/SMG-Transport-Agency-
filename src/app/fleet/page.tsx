import type { Metadata } from 'next';
import { Bus, CheckCircle2 } from 'lucide-react';
import { getDb } from '@/lib/db';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Our Fleet',
  description: 'Comfortable, well-maintained coaches across Standard, Business and VIP classes.',
};

export default function FleetPage() {
  const db = getDb();
  const buses = db.listBuses().filter((b) => b.status !== 'archived');

  return (
    <>
      <PageHeader
        title="Our Fleet"
        subtitle="Comfortable, well-maintained coaches across Standard, Business and VIP classes."
      />
      <div className="container-page py-12">
        {/* PLACEHOLDER: fleet photographs are temporary. Replace with original SMG photos before launch. */}
        <div className="mb-8 rounded-md border border-dashed border-border bg-cloud p-4 text-sm text-muted-foreground">
          Fleet images are placeholders. Professional photographs of SMG buses will replace these before launch.
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {buses.map((bus) => (
            <Card key={bus.id} className="overflow-hidden">
              <div className="grid h-40 place-items-center bg-navy text-white">
                <Bus className="size-14 text-gold" />
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-bold text-navy">{bus.name}</h2>
                  <Badge variant={bus.category === 'vip' ? 'gold' : bus.category === 'business' ? 'navy' : 'muted'}>
                    {bus.category.toUpperCase()}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Bus {bus.busNumber} · {bus.capacity} seats
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
