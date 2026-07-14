'use client';

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Alert } from '@/components/ui/misc';
import type { SystemSettings } from '@/lib/types';

export function SettingsForm({ initial }: { initial: SystemSettings }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  function set<K extends keyof SystemSettings>(key: K, value: number) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancellationCutoffHours: form.cancellationCutoffHours,
          reschedulingCutoffHours: form.reschedulingCutoffHours,
          cancellationFeePercent: form.cancellationFeePercent,
          maxReschedules: form.maxReschedules,
          refundProcessingDays: form.refundProcessingDays,
          seatHoldTtlSeconds: form.seatHoldTtlSeconds,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ type: 'danger', text: json.error ?? 'Could not save settings.' });
        return;
      }
      setMsg({ type: 'success', text: 'Settings saved.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="max-w-2xl space-y-5">
      <Alert variant="warning">
        <span className="text-xs">
          These values control cancellation, rescheduling and seat-hold behaviour. Review them before launch
          and update them any time the approved policy changes.
        </span>
      </Alert>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cancellation cut-off (hours before departure)" htmlFor="c1">
          <Input id="c1" type="number" value={form.cancellationCutoffHours} onChange={(e) => set('cancellationCutoffHours', Number(e.target.value))} />
        </Field>
        <Field label="Rescheduling cut-off (hours before departure)" htmlFor="c2">
          <Input id="c2" type="number" value={form.reschedulingCutoffHours} onChange={(e) => set('reschedulingCutoffHours', Number(e.target.value))} />
        </Field>
        <Field label="Cancellation fee (%)" htmlFor="c3">
          <Input id="c3" type="number" value={form.cancellationFeePercent} onChange={(e) => set('cancellationFeePercent', Number(e.target.value))} />
        </Field>
        <Field label="Maximum reschedules per booking" htmlFor="c4">
          <Input id="c4" type="number" value={form.maxReschedules} onChange={(e) => set('maxReschedules', Number(e.target.value))} />
        </Field>
        <Field label="Refund processing time (days)" htmlFor="c5">
          <Input id="c5" type="number" value={form.refundProcessingDays} onChange={(e) => set('refundProcessingDays', Number(e.target.value))} />
        </Field>
        <Field label="Seat hold lifetime (seconds)" htmlFor="c6">
          <Input id="c6" type="number" value={form.seatHoldTtlSeconds} onChange={(e) => set('seatHoldTtlSeconds', Number(e.target.value))} />
        </Field>
      </div>
      {msg && <Alert variant={msg.type}>{msg.text}</Alert>}
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save settings
      </Button>
    </form>
  );
}
