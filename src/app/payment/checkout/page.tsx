import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CheckoutClient } from './checkout-client';

export const metadata: Metadata = { title: 'Payment', robots: { index: false } };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="container-page py-20 text-center text-muted-foreground">Loading payment…</div>}>
      <CheckoutClient />
    </Suspense>
  );
}
