'use client';

import { useState } from 'react';
import { Printer, Mail, Loader2, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function TicketActions({ reference }: { reference: string }) {
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function resend() {
    setSending(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/bookings/${reference}/resend`, { method: 'POST' });
      const json = await res.json();
      setMsg(
        res.ok
          ? json.data.delivered
            ? `E-ticket re-sent to ${json.data.to}.`
            : `Queued for ${json.data.to}. (Email is logged in demo mode.)`
          : json.error ?? 'Could not resend the ticket.',
      );
    } catch {
      setMsg('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="no-print space-y-3">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => window.print()}>
          <Printer className="size-4" /> Print / Save as PDF
        </Button>
        <Button variant="outline" onClick={resend} disabled={sending}>
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Email me the ticket
        </Button>
        <Link href="/dashboard">
          <Button variant="ghost">
            <LayoutDashboard className="size-4" /> My dashboard
          </Button>
        </Link>
      </div>
      {msg && <p className="text-sm text-green-700" role="status">{msg}</p>}
    </div>
  );
}
