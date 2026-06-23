import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * PLACEHOLDER LOGO — text/monogram only.
 * The final SMG logo is not yet available (intake form §12). Replace this
 * component's mark with the official logo before launch.
 * See CONTENT_REPLACEMENT_CHECKLIST.md.
 */
export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      href="/"
      className={cn('group inline-flex items-center gap-2.5', className)}
      aria-label="SMG Transport Agency — home"
    >
      <span
        className="grid size-10 place-items-center rounded-lg bg-gold font-heading text-lg font-extrabold text-navy shadow-sm"
        aria-hidden
      >
        SMG
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-heading text-base font-extrabold text-navy">SMG</span>
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Transport Agency
          </span>
        </span>
      )}
    </Link>
  );
}
