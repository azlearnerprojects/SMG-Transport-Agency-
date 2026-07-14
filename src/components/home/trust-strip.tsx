import { Clock, Headphones, ShieldCheck, Sofa, type LucideIcon } from 'lucide-react';

const ITEMS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: ShieldCheck, title: 'Safe & Reliable', body: 'Your safety is our priority' },
  { icon: Sofa, title: 'Comfortable Travel', body: 'Modern buses, smooth rides' },
  { icon: Clock, title: 'On-Time Guarantee', body: 'We value your time' },
  { icon: Headphones, title: 'Dedicated Support', body: "We're here to help 24/7" },
];

/** Slim reassurance strip beneath the route cards. */
export function TrustStrip() {
  return (
    <section aria-label="Why travel with SMG" className="border-t border-border bg-white py-10">
      <div className="container-page grid grid-cols-2 gap-6 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-start gap-3">
            <span
              className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600"
              aria-hidden
            >
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-heading text-sm font-bold text-navy">{title}</p>
              <p className="text-xs text-muted-foreground sm:text-sm">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
