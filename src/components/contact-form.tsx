'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Loader2, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, Alert } from '@/components/ui/misc';
import { contactSchema } from '@/lib/schemas';
import type { z } from 'zod';

type ContactInput = z.infer<typeof contactSchema>;

export function ContactForm() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(values: ContactInput) {
    setStatus('sending');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(json.error ?? 'Could not send your message. Please try again.');
        return;
      }
      setStatus('sent');
      reset();
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  }

  if (status === 'sent') {
    return (
      <Alert variant="success" title="Message sent">
        Thanks for reaching out — our support team will get back to you shortly.
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={() => setStatus('idle')}>
            <CheckCircle2 className="size-4" /> Send another message
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Honeypot field — hidden from humans, must remain empty. */}
      <div className="absolute left-[-9999px]" aria-hidden>
        <label htmlFor="website">Website</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="name" required error={errors.name?.message}>
          <Input id="name" {...register('name')} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Email" htmlFor="email" required error={errors.email?.message}>
          <Input id="email" type="email" {...register('email')} aria-invalid={!!errors.email} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone (optional)" htmlFor="phone" error={errors.phone?.message}>
          <Input id="phone" type="tel" {...register('phone')} />
        </Field>
        <Field label="Subject" htmlFor="subject" required error={errors.subject?.message}>
          <Input id="subject" {...register('subject')} aria-invalid={!!errors.subject} />
        </Field>
      </div>
      <Field label="Message" htmlFor="message" required error={errors.message?.message}>
        <Textarea id="message" rows={5} {...register('message')} aria-invalid={!!errors.message} />
      </Field>

      {status === 'error' && errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

      <Button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? <><Loader2 className="size-4 animate-spin" /> Sending…</> : <><Send className="size-4" /> Send message</>}
      </Button>
    </form>
  );
}
