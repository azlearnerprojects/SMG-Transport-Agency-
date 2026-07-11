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
    <section className={cn('border-b border-border bg-gradient-to-b from-white to-cloud', className)}>
      <div className="container-page py-10 md:py-14">
        <h1 className="max-w-4xl font-heading text-3xl font-extrabold text-navy md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
