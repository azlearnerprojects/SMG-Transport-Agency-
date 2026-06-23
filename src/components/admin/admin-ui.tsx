import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminPageTitle({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-navy">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon && <Icon className="size-5 text-gold" />}
      </div>
      <p className="mt-2 font-heading text-2xl font-extrabold text-navy">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  empty = 'No records found.',
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cn('px-4 py-3 font-heading text-xs font-bold uppercase tracking-wide text-navy', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3 align-middle text-navy/90', c.className)}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Server component shown when a staff member lacks the required role. */
export function RestrictedNotice({ module }: { module: string }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-border bg-white p-12 text-center">
      <Lock className="size-8 text-muted-foreground" />
      <p className="mt-3 font-semibold text-navy">Access restricted</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Your role does not have permission to view <strong>{module}</strong>. Contact a Super Administrator if you
        need access.
      </p>
    </div>
  );
}
