'use client';

import { useEffect, useMemo } from 'react';
import {
  bookingAnalyticsItem,
  trackPurchase,
  type AnalyticsItem,
} from '@/lib/analytics';

type PaymentSuccessAnalyticsProps = {
  reference: string;
  origin: string;
  destination: string;
  seatCategory: string;
  seatCount: number;
  total: number;
  currency: string;
  travelDate: string;
  promoCode?: string;
};

export function PaymentSuccessAnalytics({
  reference,
  origin,
  destination,
  seatCategory,
  seatCount,
  total,
  currency,
  travelDate,
  promoCode,
}: PaymentSuccessAnalyticsProps) {
  const items = useMemo<AnalyticsItem[]>(
    () => [
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
    [destination, origin, reference, seatCategory, seatCount, total, travelDate],
  );

  useEffect(() => {
    const storageKey = `smg_ga_purchase_${reference}`;

    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, '1');
    } catch {
      // If storage is unavailable, still send the transaction_id so GA can dedupe.
    }

    trackPurchase({
      transactionId: reference,
      value: total,
      currency,
      coupon: promoCode,
      items,
    });
  }, [currency, items, promoCode, reference, total]);

  return null;
}
