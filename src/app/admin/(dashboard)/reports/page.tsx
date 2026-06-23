import type { Metadata } from 'next';
import { Wallet, TrendingUp, XCircle, RotateCcw } from 'lucide-react';
import { getDb } from '@/lib/db';
import { AdminPageTitle, StatCard } from '@/components/admin/admin-ui';
import { CsvButton } from '@/components/admin/csv-button';
import { formatCurrency, formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Admin · Reports' };

const METHOD_LABEL: Record<string, string> = { mobile_money: 'Mobile Money', card: 'Card', bank_transfer: 'Bank transfer' };

export default function AdminReports() {
  const db = getDb();
  const r = db.reports();
  const maxRouteRevenue = Math.max(1, ...r.revenueByRoute.map((x) => x.revenue));

  return (
    <>
      <AdminPageTitle title="Reports" description="Revenue, occupancy and booking analytics (demo data)." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total revenue" value={formatCurrency(r.totalRevenue)} icon={Wallet} />
        <StatCard label="Seat occupancy" value={`${r.occupancyRate}%`} icon={TrendingUp} />
        <StatCard label="Cancellations" value={r.cancellations} icon={XCircle} />
        <StatCard label="Refunds" value={r.refunds} icon={RotateCcw} />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-navy">Revenue by route</h2>
          <CsvButton filename="revenue-by-route" rows={r.revenueByRoute} />
        </div>
        <div className="space-y-2 rounded-lg border border-border bg-white p-5">
          {r.revenueByRoute.length === 0 && <p className="text-sm text-muted-foreground">No confirmed revenue yet.</p>}
          {r.revenueByRoute.map((row) => (
            <div key={row.route} className="text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-navy">{row.route}</span>
                <span className="text-muted-foreground">{formatCurrency(row.revenue)} · {row.bookings} bookings</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-gold" style={{ width: `${(row.revenue / maxRouteRevenue) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ReportTable
          title="Revenue by bus"
          csvName="revenue-by-bus"
          rows={r.revenueByBus}
          columns={[
            { key: 'bus', header: 'Bus' },
            { key: 'bookings', header: 'Bookings' },
            { key: 'revenue', header: 'Revenue', fmt: (v) => formatCurrency(Number(v)) },
          ]}
        />
        <ReportTable
          title="Revenue by date"
          csvName="revenue-by-date"
          rows={r.revenueByDate}
          columns={[
            { key: 'date', header: 'Date', fmt: (v) => formatDate(String(v)) },
            { key: 'bookings', header: 'Bookings' },
            { key: 'revenue', header: 'Revenue', fmt: (v) => formatCurrency(Number(v)) },
          ]}
        />
        <ReportTable
          title="Payment methods"
          csvName="payment-methods"
          rows={r.paymentMethods}
          columns={[
            { key: 'method', header: 'Method', fmt: (v) => METHOD_LABEL[String(v)] ?? String(v) },
            { key: 'count', header: 'Transactions' },
          ]}
        />
        <ReportTable
          title="Popular routes"
          csvName="popular-routes"
          rows={r.popularRoutes}
          columns={[
            { key: 'route', header: 'Route' },
            { key: 'bookings', header: 'Bookings' },
          ]}
        />
      </div>
    </>
  );
}

function ReportTable({
  title,
  csvName,
  rows,
  columns,
}: {
  title: string;
  csvName: string;
  rows: Record<string, unknown>[];
  columns: { key: string; header: string; fmt?: (v: unknown) => string }[];
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-navy">{title}</h2>
        <CsvButton filename={csvName} rows={rows} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-navy">{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-6 text-center text-muted-foreground">No data yet.</td></tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-2.5 text-navy/90">{c.fmt ? c.fmt(row[c.key]) : String(row[c.key])}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
