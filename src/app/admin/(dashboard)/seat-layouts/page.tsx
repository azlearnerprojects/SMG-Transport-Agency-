import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { AdminPageTitle } from '@/components/admin/admin-ui';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Admin · Seat Layouts' };

export default async function AdminSeatLayouts() {
  const db = getDb();
  const layouts = await db.listLayouts();

  return (
    <>
      <AdminPageTitle title="Seat Layouts" description="Reusable coach layouts assigned to buses. Seats carry a class used for fares." />
      <div className="grid gap-6 md:grid-cols-2">
        {layouts.map((l) => {
          const byCat = l.cells.filter((c) => c.kind === 'seat').reduce<Record<string, number>>((acc, c) => {
            acc[c.category] = (acc[c.category] ?? 0) + 1;
            return acc;
          }, {});
          return (
            <Card key={l.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading font-bold text-navy">{l.name}</h2>
                  <Badge variant="muted">{l.capacity} seats</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {Object.entries(byCat).map(([cat, n]) => (
                    <Badge key={cat} variant={cat === 'vip' ? 'gold' : cat === 'business' ? 'navy' : 'outline'}>
                      {cat}: {n}
                    </Badge>
                  ))}
                </div>
                {/* Mini preview */}
                <div className="mt-4 grid w-fit gap-1" style={{ gridTemplateColumns: `repeat(${l.cols}, 1fr)` }}>
                  {l.cells.map((c, i) =>
                    c.kind === 'seat' ? (
                      <span
                        key={c.id}
                        title={`${c.id} (${c.category})`}
                        className={`size-3.5 rounded-sm ${c.category === 'vip' ? 'bg-gold' : c.category === 'business' ? 'bg-navy' : 'bg-navy/30'}`}
                      />
                    ) : (
                      <span key={`g-${i}`} className="size-3.5" />
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
