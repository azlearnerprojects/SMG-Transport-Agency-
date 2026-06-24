import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      href="/"
      className={cn('group inline-flex items-center gap-2.5', className)}
      aria-label="SMG Transport Agency home"
    >
      <span
        className="grid size-10 place-items-center overflow-hidden rounded-lg bg-blue shadow-sm ring-1 ring-navy/10"
        aria-hidden
      >
        <Image
          src="/brand/logo-mark.png"
          alt=""
          width={34}
          height={28}
          className="object-contain"
          priority
        />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block font-heading text-base font-extrabold text-navy">SMG</span>
          <span className="block text-[11px] font-semibold uppercase text-muted-foreground">
            Transport Agency
          </span>
        </span>
      )}
    </Link>
  );
}
