import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getDb } from '@/lib/db';
import { DeleteForm } from '@/components/admin/delete-form';
import { deleteSeatLayout, saveSeatLayout } from '../entity-actions';
import { AdminPageTitle } from '@/components/admin/admin-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { SeatCategory, SeatLayout } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin · Seat Layouts' };

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-navy" htmlFor={htmlFor}>
      <span>{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function categoryBadgeVariant(category: SeatCategory) {
  if (category === 'vip') return 'gold';
  if (category === 'business') return 'navy';
  return 'outline';
}

function layoutStats(layout: SeatLayout) {
  return layout.cells.filter((cell) => cell.kind === 'seat').reduce<Record<SeatCategory, number>>(
    (acc, cell) => {
      acc[cell.category] += 1;
      return acc;
    },
    { standard: 0, business: 0, vip: 0 },
  );
}

function templateDefaults(layout?: SeatLayout) {
  if (!layout) return { leftSeats: 2, rightSeats: 2, vipRows: 1, businessRows: 2 };
  const aisleCol = layout.cells.find((cell) => cell.kind === 'aisle')?.col ?? Math.floor(layout.cols / 2);
  const categoriesByRow = Array.from({ length: layout.rows }, (_, index) => {
    const row = index + 1;
    const seats = layout.cells.filter((cell) => cell.row === row && cell.kind === 'seat');
    return seats[0]?.category ?? 'standard';
  });
  let vipRows = 0;
  let businessRows = 0;
  for (const category of categoriesByRow) {
    if (category === 'vip' && businessRows === 0) vipRows += 1;
    else if (category === 'business') businessRows += 1;
  }
  return {
    leftSeats: Math.max(1, aisleCol),
    rightSeats: Math.max(1, layout.cols - aisleCol - 1),
    vipRows,
    businessRows,
  };
}

function SeatMapPreview({ layout }: { layout: SeatLayout }) {
  return (
    <div className="grid w-fit gap-1" style={{ gridTemplateColumns: `repeat(${layout.cols}, 1fr)` }}>
      {layout.cells.map((cell, index) =>
        cell.kind === 'seat' ? (
          <span
            key={cell.id}
            title={`${cell.id} (${cell.category})`}
            className={`size-3.5 rounded-sm ${cell.category === 'vip' ? 'bg-gold' : cell.category === 'business' ? 'bg-navy' : 'bg-navy/30'}`}
          />
        ) : (
          <span key={`gap-${index}`} className="size-3.5" />
        ),
      )}
    </div>
  );
}

function LayoutForm({ layout }: { layout?: SeatLayout }) {
  const suffix = layout?.id ?? 'new';
  const defaults = templateDefaults(layout);
  return (
    <Card>
      <CardContent className="p-6">
        <form action={saveSeatLayout} className="space-y-4">
          {layout && <input type="hidden" name="id" value={layout.id} />}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-bold text-navy">{layout ? layout.name : 'New layout'}</h2>
              {layout && <p className="mt-1 text-xs text-muted-foreground">{layout.capacity} seats across {layout.rows} rows</p>}
            </div>
            {layout && <Badge variant="muted">{layout.id}</Badge>}
          </div>

          <Field label="Layout name" htmlFor={`name-${suffix}`}>
            <Input id={`name-${suffix}`} name="name" defaultValue={layout?.name ?? ''} required />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Rows" htmlFor={`rows-${suffix}`}>
              <Input id={`rows-${suffix}`} name="rows" type="number" min={1} max={20} defaultValue={layout?.rows ?? 12} required />
            </Field>
            <Field label="Left seats" htmlFor={`left-${suffix}`}>
              <Input id={`left-${suffix}`} name="leftSeats" type="number" min={1} max={3} defaultValue={defaults.leftSeats} required />
            </Field>
            <Field label="Right seats" htmlFor={`right-${suffix}`}>
              <Input id={`right-${suffix}`} name="rightSeats" type="number" min={1} max={3} defaultValue={defaults.rightSeats} required />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="VIP rows" htmlFor={`vip-${suffix}`}>
              <Input id={`vip-${suffix}`} name="vipRows" type="number" min={0} max={20} defaultValue={defaults.vipRows} required />
            </Field>
            <Field label="Business rows" htmlFor={`business-${suffix}`}>
              <Input id={`business-${suffix}`} name="businessRows" type="number" min={0} max={20} defaultValue={defaults.businessRows} required />
            </Field>
          </div>

          {layout && (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(layoutStats(layout)).map(([category, count]) => (
                  <Badge key={category} variant={categoryBadgeVariant(category as SeatCategory)}>
                    {category}: {count}
                  </Badge>
                ))}
              </div>
              <SeatMapPreview layout={layout} />
            </div>
          )}

          <Button type="submit" size="sm">{layout ? 'Save Layout' : 'Create Layout'}</Button>
        </form>
        {layout && (
          <div className="mt-3 flex justify-end">
            <DeleteForm action={deleteSeatLayout} id={layout.id} label={layout.name} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AdminSeatLayouts() {
  const db = getDb();
  const layouts = await db.listLayouts();

  return (
    <>
      <AdminPageTitle
        title="Seat Layouts"
        description="Create and update reusable coach seating templates assigned to buses."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <LayoutForm />
        <div className="grid gap-6 lg:grid-cols-2">
          {layouts.map((layout) => (
            <LayoutForm key={layout.id} layout={layout} />
          ))}
        </div>
      </div>
    </>
  );
}
