import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { ProgressSteps } from '@/components/booking/progress-steps';
import { BookingDetails } from '@/components/booking/booking-details';
import { PaymentPanel } from '@/components/booking/payment-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buildNoIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = buildNoIndexMetadata('Review & Pay');

export default async function ReviewPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const db = getDb();
  const booking = await db.getBookingByReference(reference);
  if (!booking) notFound();
  if (booking.status === 'confirmed') redirect(`/ticket/${booking.reference}`);

  return (
    <div className="bg-cloud pb-16">
      <div className="border-b border-border bg-white">
        <div className="container-page py-6">
          <ProgressSteps current={3} />
        </div>
      </div>

      <div className="container-page grid gap-6 pt-8 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Review your booking</CardTitle>
            <Badge variant="outline">Ref: {booking.reference}</Badge>
          </CardHeader>
          <CardContent>
            <p className="mb-5 text-sm text-muted-foreground">
              Please confirm the details below are correct before paying. You can go back to edit your seat
              or passenger information.
            </p>
            <BookingDetails booking={booking} />
          </CardContent>
        </Card>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentPanel reference={booking.reference} total={booking.total} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
