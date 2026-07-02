import type { Metadata } from 'next';
import Link from 'next/link';
import { Tag, Copy } from 'lucide-react';
import { getDb } from '@/lib/db';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Promotions',
  description: 'Current SMG travel offers and discount codes.',
};

export default async function PromotionsPage() {
  const db = getDb();
  const promos = (await db.listPromotions()).filter((p) => p.active);

  return (
    <>
      <PageHeader title="Promotions" subtitle="Save on your next trip with our current offers." />
      <div className="container-page py-12">
        {promos.length === 0 ? (
          <p className="text-muted-foreground">No active promotions right now. Check back soon!</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {promos.map((p) => (
              <Card key={p.id} className="flex flex-col border-gold/40">
                <CardContent className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-2 text-gold-700">
                    <Tag className="size-5" />
                    <Badge variant="gold">{p.type === 'percent' ? `${p.value}% off` : `GH₵${p.value} off`}</Badge>
                  </div>
                  <h2 className="mt-3 font-heading text-lg font-bold text-navy">{p.title}</h2>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.description}</p>
                  <div className="mt-4 flex items-center justify-between rounded-md border border-dashed border-navy/30 bg-cloud px-3 py-2">
                    <span className="font-mono text-sm font-bold tracking-wider text-navy">{p.code}</span>
                    <Copy className="size-4 text-muted-foreground" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Valid until {formatDate(p.endsAt)}</p>
                  <Link href="/book" className="mt-4">
                    <Button className="w-full">Book &amp; apply</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
