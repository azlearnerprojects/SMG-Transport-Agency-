import { CURRENCY } from './config';

/** Format an integer pesewa-free cedi amount as GH₵ with thousands separators. */
export function formatCurrency(amount: number): string {
  return `${CURRENCY.symbol}${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "Mon, 23 Jun 2026" */
export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** "14:30" from an ISO string or "HH:mm" passthrough. */
export function formatTime(value: string): string {
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Convert a duration in minutes to "5h 30m". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Human-readable relative countdown, e.g. "9:58" for a seat-hold timer. */
export function formatCountdown(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
