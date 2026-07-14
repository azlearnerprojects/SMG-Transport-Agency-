import { Armchair, Headphones, Smartphone, Ticket, type LucideIcon } from 'lucide-react';

const BENEFITS: { icon: LucideIcon; label: string }[] = [
  { icon: Armchair, label: 'Real-time seat selection' },
  { icon: Smartphone, label: 'Mobile Money & card payments' },
  { icon: Ticket, label: 'Instant e-tickets' },
  { icon: Headphones, label: '24/7 customer support' },
];

/** The four headline service benefits shown in the hero, in a 2×2 grid. */
export function ServiceBenefits() {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {BENEFITS.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full border border-orange-200 bg-orange-50 text-orange-600"
            aria-hidden
          >
            <Icon className="size-5" />
          </span>
          <span className="text-sm font-medium text-navy sm:text-base">{label}</span>
        </li>
      ))}
    </ul>
  );
}
