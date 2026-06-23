import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={cn('border-b border-border bg-navy text-white', className)}>
      <div className="container-page py-10 md:py-14">
        <h1 className="font-heading text-3xl font-extrabold text-white md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-white/75">{subtitle}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
