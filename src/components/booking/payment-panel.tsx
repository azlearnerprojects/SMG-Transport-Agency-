'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, CreditCard, Landmark, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/misc';
import { formatCurrency } from '@/lib/format';
import { bookingAnalyticsItem, trackAddPaymentInfo } from '@/lib/analytics';
import type { PaymentMethod } from '@/lib/types';

const METHODS: { id: PaymentMethod; label: string; hint: string; icon: typeof Smartphone }[] = [
  { id: 'mobile_money', label: 'Mobile Money', hint: 'MTN, Telecel/Vodafone Cash, AirtelTigo', icon: Smartphone },
  { id: 'card', label: 'Visa / Mastercard', hint: 'Debit or credit card', icon: CreditCard },
  { id: 'bank_transfer', label: 'Bank transfer', hint: 'For corporate / bulk bookings', icon: Landmark },
];

type PaymentPanelProps = {
  reference: string;
  total: number;
  currency: string;
  origin: string;
  destination: string;
  seatCategory: string;
  seatCount: number;
  travelDate: string;
  promoCode?: string;
};

export function PaymentPanel({
  reference,
  total,
  currency,
  origin,
  destination,
  seatCategory,
  seatCount,
  travelDate,
  promoCode,
}: PaymentPanelProps) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>('mobile_money');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setLoading(true);
    trackAddPaymentInfo({
      value: total,
      currency,
      paymentType: method,
      coupon: promoCode,
      items: [
        bookingAnalyticsItem({
          reference,
          origin,
          destination,
          seatCategory,
          seatCount,
          total,
          travelDate,
        }),
      ],
    });
    try {
      const res = await fetch('/api/payments/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingReference: reference, method }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Could not start payment. Please try again.');
        return;
      }
      // Hand off to the provider (mock simulated gateway or real Paystack page).
      window.location.href = json.data.authorizationUrl;
    } catch {
      setError('Network error starting payment. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-navy">Choose a payment method</legend>
        {METHODS.map((m) => {
          const active = method === m.id;
          return (
            <label
              key={m.id}
              className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${
                active ? 'border-gold bg-gold-50' : 'border-input hover:bg-muted'
              }`}
            >
              <input
                type="radio"
                name="method"
                value={m.id}
                checked={active}
                onChange={() => setMethod(m.id)}
                className="size-4 accent-gold"
              />
              <m.icon className="size-5 text-navy" />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-navy">{m.label}</span>
                <span className="block text-xs text-muted-foreground">{m.hint}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {error && <Alert variant="danger">{error}</Alert>}

      <Button size="lg" className="w-full" onClick={pay} disabled={loading}>
        {loading ? <><Loader2 className="size-4 animate-spin" /> Starting payment…</> : `Pay ${formatCurrency(total)}`}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-green-700" /> Payments are verified securely on our server.
      </p>
      <button
        type="button"
        onClick={() => router.back()}
        className="w-full text-center text-sm font-medium text-navy hover:underline"
      >
        ← Go back and edit
      </button>
    </div>
  );
}
