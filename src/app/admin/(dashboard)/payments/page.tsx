import type { Metadata } from 'next';
import { getDb } from '@/lib/db';
import { AdminPageTitle, DataTable, type Column } from '@/components/admin/admin-ui';
import { CsvButton } from '@/components/admin/csv-button';
import { PaymentStatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Payment } from '@/lib/types';

export const metadata: Metadata = { title: 'Admin · Payments' };

const METHOD_LABEL: Record<string, string> = { mobile_money: 'Mobile Money', card: 'Card', bank_transfer: 'Bank transfer' };

export default function AdminPayments() {
  const db = getDb();
  const payments = db.listPayments();
  const total = payments.filter((p) => p.status === 'successful').reduce((s, p) => s + p.amount, 0);

  const csv = payments.map((p) => ({
    reference: p.providerReference ?? p.reference,
    bookingId: p.bookingId,
    provider: p.provider,
    method: p.method,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    createdAt: p.createdAt,
    verifiedAt: p.verifiedAt ?? '',
  }));

  const cols: Column<Payment>[] = [
    { key: 'reference', header: 'Provider ref', render: (p) => <span className="font-mono text-xs">{p.providerReference ?? p.reference}</span> },
    { key: 'provider', header: 'Provider', render: (p) => <Badge variant="muted">{p.provider}</Badge> },
    { key: 'method', header: 'Method', render: (p) => METHOD_LABEL[p.method] ?? p.method },
    { key: 'amount', header: 'Amount', render: (p) => formatCurrency(p.amount) },
    { key: 'status', header: 'Status', render: (p) => <PaymentStatusBadge status={p.status} /> },
    { key: 'createdAt', header: 'Date', render: (p) => formatDate(p.createdAt) },
  ];

  return (
    <>
      <AdminPageTitle
        title="Payments"
        description={`Verified revenue: ${formatCurrency(total)}. All confirmations are server-verified.`}
        action={<CsvButton filename="smg-payments" rows={csv} />}
      />
      <DataTable columns={cols} rows={payments} empty="No payments recorded yet." />
    </>
  );
}
