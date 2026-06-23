import { formatCurrency } from '@/lib/format';
import { Separator } from '@/components/ui/misc';

export interface FareLine {
  baseFare: number;
  fees: number;
  discount: number;
  total: number;
}

export function FareSummary({ fare, seatCount, currencyNote }: { fare: FareLine; seatCount: number; currencyNote?: boolean }) {
  return (
    <div className="space-y-2 text-sm">
      <Row label={`Base fare (${seatCount} seat${seatCount > 1 ? 's' : ''})`} value={formatCurrency(fare.baseFare)} />
      <Row label="Service fee" value={formatCurrency(fare.fees)} />
      {fare.discount > 0 && <Row label="Discount" value={`− ${formatCurrency(fare.discount)}`} accent />}
      <Separator className="my-2" />
      <div className="flex items-center justify-between">
        <span className="font-heading text-base font-bold text-navy">Total</span>
        <span className="font-heading text-xl font-extrabold text-navy">{formatCurrency(fare.total)}</span>
      </div>
      {currencyNote && <p className="text-xs text-muted-foreground">All prices in Ghana Cedis (GHS).</p>}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? 'font-semibold text-green-700' : 'font-medium text-navy'}>{value}</span>
    </div>
  );
}
