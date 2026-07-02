import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CheckoutClient } from './checkout-client';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('Payment');

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="container-page py-20 text-center text-muted-foreground">Loading payment…</div>}>
      <CheckoutClient />
    </Suspense>
  );
}
