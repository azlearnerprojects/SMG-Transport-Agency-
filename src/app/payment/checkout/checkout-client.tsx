'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Smartphone, CreditCard, Landmark, Loader2, ShieldCheck, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/misc';
import { formatCurrency } from '@/lib/format';

const ICON: Record<string, typeof Smartphone> = {
  mobile_money: Smartphone,
  card: CreditCard,
  bank_transfer: Landmark,
};

/**
 * Simulated payment gateway for DEMO mode ONLY.
 * It performs no real transaction — it lets you approve or fail a payment so the
 * end-to-end flow (server verification → confirmation → e-ticket) is testable.
 */
export function CheckoutClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const providerReference = sp.get('ref') ?? '';
  const bookingReference = sp.get('booking') ?? '';
  const amount = Number(sp.get('amount') ?? '0');
  const method = sp.get('method') ?? 'mobile_money';
  const Icon = ICON[method] ?? Smartphone;

  const [loading, setLoading] = useState<'approve' | 'fail' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setLoading('approve');
    setError(null);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerReference, bookingReference }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Verification failed.');
        setLoading(null);
        return;
      }
      router.push(`/payment/status?status=success&ref=${encodeURIComponent(bookingReference)}`);
    } catch {
      setError('Network error during verification.');
      setLoading(null);
    }
  }

  async function fail() {
    setLoading('fail');
    await fetch('/api/payments/fail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingReference }),
    }).catch(() => undefined);
    router.push(`/payment/status?status=failed&ref=${encodeURIComponent(bookingReference)}`);
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
            <FlaskConical className="size-3.5" /> Demo Payment Gateway — no real charge
          </div>
          <CardTitle className="flex items-center gap-2">
            <Icon className="size-5 text-navy" /> Confirm payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-navy p-4 text-white">
            <p className="text-xs text-white/70">Amount due</p>
            <p className="font-heading text-3xl font-extrabold">{formatCurrency(amount)}</p>
            <p className="mt-1 text-xs text-white/70">Booking {bookingReference}</p>
          </div>
          {error && <Alert variant="danger">{error}</Alert>}
          <Button className="w-full" size="lg" onClick={approve} disabled={loading !== null}>
            {loading === 'approve' ? <><Loader2 className="size-4 animate-spin" /> Verifying…</> : 'Approve & pay'}
          </Button>
          <Button variant="outline" className="w-full" onClick={fail} disabled={loading !== null}>
            {loading === 'fail' ? <><Loader2 className="size-4 animate-spin" /> …</> : 'Simulate failed payment'}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-green-700" /> In production this is the secure provider page (e.g. Paystack).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
