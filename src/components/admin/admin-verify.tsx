'use client';

import { useState } from 'react';
import { Search, CheckCircle2, XCircle, Loader2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/misc';
import { formatDate, formatTime } from '@/lib/format';

interface VerifyResult {
  found: boolean;
  valid?: boolean;
  reference?: string;
  ticketNumber?: string;
  passenger?: string;
  route?: string;
  travelDate?: string;
  departureTime?: string;
  seats?: string[];
  busNumber?: string;
  status?: string;
}

export function AdminVerify() {
  const [ref, setRef] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    if (!ref.trim()) return;
    setLoading(true);
    setMsg(null);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/verify?ref=${encodeURIComponent(ref.trim())}`);
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error ?? 'Verification failed.');
        return;
      }
      setResult(json.data.result);
    } finally {
      setLoading(false);
    }
  }

  async function checkIn() {
    if (!result?.reference) return;
    setCheckingIn(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: result.reference }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error ?? 'Check-in failed.');
        return;
      }
      setMsg('Passenger checked in.');
      verify();
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <form onSubmit={verify} className="flex gap-2">
        <Input value={ref} onChange={(e) => setRef(e.target.value.toUpperCase())} placeholder="Scan or type booking reference (e.g. SMG-XXXXXXXX)" />
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Verify
        </Button>
      </form>

      {msg && <Alert variant="info">{msg}</Alert>}

      {result && (
        <Card>
          <CardContent className="p-6">
            {!result.found ? (
              <div className="flex items-center gap-3 text-red-700">
                <XCircle className="size-6" /> <span className="font-semibold">No booking found for {ref}.</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {result.valid ? (
                    <span className="flex items-center gap-2 text-green-700"><CheckCircle2 className="size-7" /> <span className="font-heading text-lg font-bold">Valid ticket</span></span>
                  ) : (
                    <span className="flex items-center gap-2 text-amber-700"><XCircle className="size-7" /> <span className="font-heading text-lg font-bold">Not valid for boarding</span></span>
                  )}
                  <Badge variant={result.valid ? 'success' : 'warning'}>{result.status}</Badge>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Item label="Reference" value={result.reference} />
                  <Item label="Passenger" value={result.passenger} />
                  <Item label="Route" value={result.route} />
                  <Item label="Travel" value={`${formatDate(result.travelDate!)} ${formatTime(result.departureTime!)}`} />
                  <Item label="Seat(s)" value={result.seats?.join(', ')} />
                  <Item label="Bus" value={result.busNumber} />
                </dl>
                {result.status === 'confirmed' && (
                  <Button className="mt-5" onClick={checkIn} disabled={checkingIn}>
                    {checkingIn ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />} Check in passenger
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium text-navy">{value}</dd>
    </div>
  );
}
