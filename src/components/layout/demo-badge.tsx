'use client';

import { useState } from 'react';
import { FlaskConical, X } from 'lucide-react';

/**
 * Subtle "Demo Mode" badge shown only when NEXT_PUBLIC_DEMO_MODE is true.
 * It is intentionally unobtrusive and dismissible — not an intrusive pop-up.
 */
export function DemoBadge() {
  const [open, setOpen] = useState(true);
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true' || !open) return null;
  return (
    <div className="no-print fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-navy/15 bg-white/95 px-3 py-1.5 text-xs font-semibold text-navy shadow-card backdrop-blur">
      <FlaskConical className="size-3.5 text-gold-700" />
      Demo Mode — sample data, no real payments
      <button
        onClick={() => setOpen(false)}
        className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-muted"
        aria-label="Dismiss demo mode badge"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
