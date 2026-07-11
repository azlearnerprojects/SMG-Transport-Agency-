import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getDb } from '@/lib/db';
import { saveFareCategory } from '../entity-actions';
import { AdminPageTitle } from '@/components/admin/admin-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { FareCategoryConfig } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin · Fare Categories' };

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-navy" htmlFor={htmlFor}>
      <span>{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function categoryBadgeVariant(key: FareCategoryConfig['key']) {
  if (key === 'vip') return 'gold';
  if (key === 'business') return 'navy';
  return 'outline';
}

function FareCategoryForm({ category }: { category: FareCategoryConfig }) {
  const suffix = category.key;
  return (
    <Card>
      <CardContent className="p-6">
        <form action={saveFareCategory} className="space-y-4">
          <input type="hidden" name="id" value={category.id} />
          <input type="hidden" name="key" value={category.key} />
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge variant={categoryBadgeVariant(category.key)}>{category.key}</Badge>
              <p className="mt-2 text-xs text-muted-foreground">Pricing field: fares.{category.key}</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-navy">
              <input type="checkbox" name="active" defaultChecked={category.active} className="size-4 rounded border-input" />
              Active
            </label>
          </div>

          <Field label="Display label" htmlFor={`label-${suffix}`}>
            <Input id={`label-${suffix}`} name="label" defaultValue={category.label} required />
          </Field>

          <Field label="Description" htmlFor={`description-${suffix}`}>
            <Textarea id={`description-${suffix}`} name="description" defaultValue={category.description} rows={3} required />
          </Field>

          <Field label="Sort order" htmlFor={`order-${suffix}`}>
            <Input id={`order-${suffix}`} name="order" type="number" min={0} max={999} defaultValue={category.order} required />
          </Field>

          <Button type="submit" size="sm">Save Category</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default async function AdminFareCategories() {
  const db = getDb();
  const categories = await db.listFareCategories();

  return (
    <>
      <AdminPageTitle
        title="Fare Categories"
        description="Configure the labels and customer-facing descriptions for each seat class. Prices are still set per departure in Schedules."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        {categories.map((category) => (
          <FareCategoryForm key={category.key} category={category} />
        ))}
      </div>
    </>
  );
}
