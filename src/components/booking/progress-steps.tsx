import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['Trip selection', 'Seat & passenger', 'Review & payment'];

/** 3-stage booking progress indicator (intake form caps booking at three steps). */
export function ProgressSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Booking progress">
      {STEPS.map((label, i) => {
        const step = (i + 1) as 1 | 2 | 3;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold',
                done && 'bg-navy text-white',
                active && 'bg-gold text-navy',
                !done && !active && 'bg-muted text-muted-foreground',
              )}
              aria-current={active ? 'step' : undefined}
            >
              {done ? <Check className="size-4" /> : step}
            </span>
            <span className={cn('hidden text-sm sm:block', active ? 'font-semibold text-navy' : 'text-muted-foreground')}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="ml-1 hidden h-px flex-1 bg-border md:block" />}
          </li>
        );
      })}
    </ol>
  );
}
