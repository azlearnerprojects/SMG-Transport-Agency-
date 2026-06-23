import type { Metadata } from 'next';
import { CheckCircle2, XCircle, ShieldQuestion } from 'lucide-react';
import { getDb } from '@/lib/db';
import { verifyReferenceToken } from '@/lib/verify-token';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Verify ticket', robots: { index: false } };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; t?: string }>;
}) {
  const { ref, t } = await searchParams;

  if (!ref || !t || !verifyReferenceToken(ref, t)) {
    return (
      <Wrapper>
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-muted text-muted-foreground">
          <ShieldQuestion className="size-9" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-navy">Invalid or expired verification link</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Scan the QR code on a valid SMG e-ticket. Staff can also verify a booking from the admin dashboard.
        </p>
      </Wrapper>
    );
  }

  const db = getDb();
  const result = db.verifyTicket(ref);

  if (!result.found) {
    return (
      <Wrapper>
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-red-100 text-red-700">
          <XCircle className="size-9" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-navy">Ticket not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">No booking matches reference {ref}.</p>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div
        className={`mx-auto grid size-16 place-items-center rounded-full ${
          result.valid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}
      >
        {result.valid ? <CheckCircle2 className="size-9" /> : <XCircle className="size-9" />}
      </div>
      <h1 className="mt-5 text-xl font-bold text-navy">
        {result.valid ? 'Valid ticket' : 'Ticket not valid for boarding'}
      </h1>
      <Badge variant={result.valid ? 'success' : 'warning'} className="mt-2">{result.status}</Badge>
      <dl className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-3 text-left text-sm">
        <Item label="Reference" value={result.reference} />
        <Item label="Passenger" value={result.passenger} />
        <Item label="Route" value={result.route} />
        <Item label="Travel date" value={`${formatDate(result.travelDate)} ${formatTime(result.departureTime)}`} />
        <Item label="Seat(s)" value={result.seats.join(', ')} />
        <Item label="Bus" value={result.busNumber} />
      </dl>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-lg text-center">
        <CardContent className="p-8">{children}</CardContent>
      </Card>
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium text-navy">{value}</dd>
    </div>
  );
}
