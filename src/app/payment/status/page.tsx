import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { getDb } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PaymentSuccessAnalytics } from '@/components/analytics/payment-success-analytics';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('Payment Status');

export default async function PaymentStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; ref?: string }>;
}) {
  const { status, ref } = await searchParams;
  const db = getDb();
  const booking = ref ? await db.getBookingByReference(ref) : undefined;
  const success = status === 'success' && booking?.status === 'confirmed';

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-lg text-center">
        <CardContent className="p-8">
          {success ? (
            <>
              <PaymentSuccessAnalytics
                reference={booking!.reference}
                origin={booking!.origin}
                destination={booking!.destination}
                seatCategory={booking!.seatCategory}
                seatCount={booking!.seatIds.length}
                total={booking!.total}
                currency={booking!.currency}
                travelDate={booking!.travelDate}
                promoCode={booking!.promoCode}
              />
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-green-100 text-green-700">
                <CheckCircle2 className="size-9" />
              </div>
              <h1 className="mt-5 text-2xl font-extrabold text-navy">Payment successful</h1>
              <p className="mt-2 text-muted-foreground">
                Your booking <strong>{booking!.reference}</strong> is confirmed. Your e-ticket is ready.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link href={`/ticket/${booking!.reference}`}><Button size="lg">View e-ticket</Button></Link>
                <Link href={`/booking/${booking!.reference}`}><Button variant="outline" size="lg">Booking details</Button></Link>
              </div>
            </>
          ) : status === 'failed' ? (
            <>
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-red-100 text-red-700">
                <XCircle className="size-9" />
              </div>
              <h1 className="mt-5 text-2xl font-extrabold text-navy">Payment not completed</h1>
              <p className="mt-2 text-muted-foreground">
                Your payment didn&rsquo;t go through and no charge was made. Your seats may still be held briefly — you can try again.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                {ref && <Link href={`/book/review/${ref}`}><Button size="lg">Try payment again</Button></Link>}
                <Link href="/book"><Button variant="outline" size="lg">Start over</Button></Link>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-amber-100 text-amber-700">
                <Clock className="size-9" />
              </div>
              <h1 className="mt-5 text-2xl font-extrabold text-navy">Payment pending</h1>
              <p className="mt-2 text-muted-foreground">
                We haven&rsquo;t confirmed this payment yet. If you completed it, your ticket will appear shortly.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link href="/manage"><Button size="lg">Find my booking</Button></Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
