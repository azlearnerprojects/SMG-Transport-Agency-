import type { Metadata } from 'next';
import { AdminPageTitle } from '@/components/admin/admin-ui';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Admin · Fare Categories' };

const CATEGORIES = [
  { key: 'standard', label: 'Standard', desc: 'Everyday comfortable travel — air conditioning and reclining seats.', tint: 'outline' as const },
  { key: 'business', label: 'Business', desc: 'Extra legroom, WiFi and refreshments for working travellers.', tint: 'navy' as const },
  { key: 'vip', label: 'VIP Executive', desc: 'Premium lounger seats, entertainment and priority boarding.', tint: 'gold' as const },
];

export default function AdminFareCategories() {
  return (
    <>
      <AdminPageTitle
        title="Fare Categories"
        description="Seat classes used across the fleet. Actual prices are set per schedule (see Schedules) and can be overridden by promotions."
      />
      <div className="grid gap-6 md:grid-cols-3">
        {CATEGORIES.map((c) => (
          <Card key={c.key}>
            <CardContent className="p-6">
              <Badge variant={c.tint}>{c.label}</Badge>
              <p className="mt-3 text-sm text-muted-foreground">{c.desc}</p>
              <p className="mt-3 text-xs text-muted-foreground">Pricing field: <code className="rounded bg-muted px-1">fares.{c.key}</code> per schedule.</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Promotional fares are configured in the Promotions module and applied server-side at booking time.
      </p>
    </>
  );
}
