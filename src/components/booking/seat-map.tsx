'use client';

import { Armchair, DoorOpen, Wrench } from 'lucide-react';
import type { SeatCell } from '@/lib/types';
import type { SeatStatus } from '@/lib/data/store';
import { cn } from '@/lib/utils';

/**
 * Interactive, keyboard-accessible seat map.
 *
 * Each seat is a real <button> (focusable, Enter/Space to toggle, aria-pressed
 * for selection state, aria-disabled for unavailable seats). Availability is
 * driven entirely by the server-provided `statuses` map — never by colour alone.
 */
const CATEGORY_TINT: Record<string, string> = {
  vip: 'data-[avail=true]:bg-gold-50',
  business: 'data-[avail=true]:bg-blue-50',
  standard: 'data-[avail=true]:bg-white',
};

export function SeatMap({
  cells,
  cols,
  statuses,
  selected,
  onToggle,
}: {
  cells: SeatCell[];
  cols: number;
  statuses: Record<string, SeatStatus>;
  selected: string[];
  onToggle: (seatId: string, category: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-center gap-2 rounded-md bg-navy px-3 py-2 text-xs font-semibold text-white">
        <Armchair className="size-4 text-gold" /> Front of bus
        <DoorOpen className="ml-auto size-4 text-gold" /> Entrance
      </div>

      <div
        className="mx-auto grid w-fit gap-1.5"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Seat map"
      >
        {cells.map((cell, idx) => {
          if (cell.kind !== 'seat') {
            return <div key={`gap-${idx}`} className="size-9" aria-hidden />;
          }
          const status = statuses[cell.id] ?? 'available';
          const isSelected = selected.includes(cell.id);
          const available = status === 'available';
          const label = `Seat ${cell.id}, ${cell.category}, ${isSelected ? 'selected' : status}`;
          return (
            <button
              key={cell.id}
              type="button"
              data-avail={available}
              aria-pressed={isSelected}
              aria-disabled={!available}
              disabled={!available && !isSelected}
              title={label}
              aria-label={label}
              onClick={() => (available || isSelected) && onToggle(cell.id, cell.category)}
              className={cn(
                'relative grid size-9 place-items-center rounded-md border text-[11px] font-semibold transition-colors',
                CATEGORY_TINT[cell.category],
                available && 'border-navy/30 text-navy hover:border-gold hover:bg-gold-50',
                isSelected && 'border-gold bg-gold text-navy shadow-sm',
                status === 'booked' && 'cursor-not-allowed border-transparent bg-navy/70 text-white/80',
                status === 'held' && 'cursor-not-allowed border-amber-300 bg-amber-100 text-amber-700',
                status === 'blocked' && 'cursor-not-allowed border-dashed border-muted-foreground/40 bg-muted text-muted-foreground',
              )}
            >
              {status === 'blocked' ? <Wrench className="size-3.5" /> : cell.id}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <Legend className="border-navy/30 bg-white" label="Available" />
        <Legend className="border-gold bg-gold" label="Selected" />
        <Legend className="bg-navy/70" label="Booked" />
        <Legend className="border-amber-300 bg-amber-100" label="Held" />
        <Legend className="border-dashed border-muted-foreground/40 bg-muted" label="Unavailable" />
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Seat colour tints indicate class: gold = VIP, blue = Business, white = Standard.
      </p>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-4 rounded border', className)} aria-hidden /> {label}
    </span>
  );
}
