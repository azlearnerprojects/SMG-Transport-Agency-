'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Building2, CreditCard, Loader2, Megaphone, Save, Settings2 } from 'lucide-react';
import { Alert, Checkbox, Field } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { PublicSiteConfig } from '@/lib/types';

function routesToText(routes: string[]) {
  return routes.join('\n');
}

function textToRoutes(value: string) {
  return value
    .split(/\r?\n/)
    .map((route) => route.trim())
    .filter(Boolean);
}

function ConfigCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-white/70 bg-white/90 p-5 shadow-card backdrop-blur">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-navy/5 text-navy">
          <Icon className="size-5" />
        </span>
        <h2 className="font-heading text-lg font-extrabold text-navy">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function AdminConfigClient({
  initial,
  configured,
}: {
  initial: PublicSiteConfig;
  configured: boolean;
}) {
  const [form, setForm] = useState(initial);
  const [featuredRoutesText, setFeaturedRoutesText] = useState(routesToText(initial.featuredRoutes));
  const [publishRemoteConfig, setPublishRemoteConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger' | 'warning'; text: string } | null>(null);

  const dangerousChange = useMemo(
    () => form.maintenanceMode || !form.bookingEnabled || form.paymentGatewayMode === 'live',
    [form.bookingEnabled, form.maintenanceMode, form.paymentGatewayMode],
  );

  function set<K extends keyof PublicSiteConfig>(key: K, value: PublicSiteConfig[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function persist(confirmDangerousChange = false) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          featuredRoutes: textToRoutes(featuredRoutesText),
          publishRemoteConfig,
          confirmDangerousChange,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ tone: res.status === 409 ? 'warning' : 'danger', text: json.error ?? 'Could not save config.' });
        if (res.status === 409) setConfirming(true);
        return;
      }
      setForm(json.data.config);
      setFeaturedRoutesText(routesToText(json.data.config.featuredRoutes));
      const remote = json.data.remoteConfig?.published ? ' Remote Config published.' : '';
      setMessage({ tone: 'success', text: `Configuration saved.${remote}` });
      setConfirming(false);
    } catch {
      setMessage({ tone: 'danger', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (dangerousChange) {
      setConfirming(true);
      return;
    }
    persist(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {!configured && (
        <Alert variant="warning" title="Firebase Admin SDK not configured">
          Changes will use the local demo fallback only. Configure server Firebase credentials before production.
        </Alert>
      )}
      {message && <Alert variant={message.tone}>{message.text}</Alert>}

      <div className="grid gap-5 xl:grid-cols-2">
        <ConfigCard icon={Building2} title="Company">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Site name" htmlFor="siteName" required>
              <Input id="siteName" value={form.siteName} onChange={(e) => set('siteName', e.target.value)} />
            </Field>
            <Field label="Support email" htmlFor="supportEmail" required>
              <Input id="supportEmail" type="email" value={form.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} />
            </Field>
            <Field label="Support phone" htmlFor="supportPhone" required>
              <Input id="supportPhone" value={form.supportPhone} onChange={(e) => set('supportPhone', e.target.value)} />
            </Field>
            <Field label="Support WhatsApp" htmlFor="supportWhatsapp" required>
              <Input id="supportWhatsapp" value={form.supportWhatsapp} onChange={(e) => set('supportWhatsapp', e.target.value)} />
            </Field>
          </div>
          <Field label="Company address" htmlFor="companyAddress" required>
            <Textarea id="companyAddress" value={form.companyAddress} onChange={(e) => set('companyAddress', e.target.value)} />
          </Field>
        </ConfigCard>

        <ConfigCard icon={Settings2} title="Booking Controls">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-semibold text-navy">
              <Checkbox checked={form.bookingEnabled} onChange={(e) => set('bookingEnabled', e.target.checked)} />
              Booking enabled
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-semibold text-navy">
              <Checkbox checked={form.maintenanceMode} onChange={(e) => set('maintenanceMode', e.target.checked)} />
              Maintenance mode
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-semibold text-navy">
              <Checkbox checked={form.bookingOpeningEnabled} onChange={(e) => set('bookingOpeningEnabled', e.target.checked)} />
              Booking window open
            </label>
            <Field label="Timezone" htmlFor="defaultTimezone">
              <Input id="defaultTimezone" value={form.defaultTimezone} onChange={(e) => set('defaultTimezone', e.target.value)} />
            </Field>
            <Field label="Cancellation window (hours)" htmlFor="cancellationWindowHours">
              <Input id="cancellationWindowHours" type="number" value={form.cancellationWindowHours} onChange={(e) => set('cancellationWindowHours', Number(e.target.value))} />
            </Field>
            <Field label="Rescheduling window (hours)" htmlFor="reschedulingWindowHours">
              <Input id="reschedulingWindowHours" type="number" value={form.reschedulingWindowHours} onChange={(e) => set('reschedulingWindowHours', Number(e.target.value))} />
            </Field>
          </div>
        </ConfigCard>

        <ConfigCard icon={CreditCard} title="Payments & Providers">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Currency" htmlFor="defaultCurrency">
              <Input id="defaultCurrency" value={form.defaultCurrency} onChange={(e) => set('defaultCurrency', e.target.value.toUpperCase())} />
            </Field>
            <Field label="Payment mode" htmlFor="paymentGatewayMode">
              <Select id="paymentGatewayMode" value={form.paymentGatewayMode} onChange={(e) => set('paymentGatewayMode', e.target.value as PublicSiteConfig['paymentGatewayMode'])}>
                <option value="test">Test</option>
                <option value="live">Live</option>
              </Select>
            </Field>
            <Field label="Service fee" htmlFor="serviceFee">
              <Input id="serviceFee" type="number" value={form.serviceFee} onChange={(e) => set('serviceFee', Number(e.target.value))} />
            </Field>
            <Field label="Tax percentage" htmlFor="taxPercentage">
              <Input id="taxPercentage" type="number" value={form.taxPercentage} onChange={(e) => set('taxPercentage', Number(e.target.value))} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Paystack public key only" htmlFor="paystackPublicKey">
                <Input id="paystackPublicKey" value={form.paystackPublicKey} onChange={(e) => set('paystackPublicKey', e.target.value)} placeholder="pk_test_..." />
              </Field>
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-semibold text-navy">
              <Checkbox checked={form.smsProviderEnabled} onChange={(e) => set('smsProviderEnabled', e.target.checked)} />
              SMS enabled
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-semibold text-navy">
              <Checkbox checked={form.emailProviderEnabled} onChange={(e) => set('emailProviderEnabled', e.target.checked)} />
              Email enabled
            </label>
          </div>
        </ConfigCard>

        <ConfigCard icon={Megaphone} title="Customer Messaging">
          <div className="grid gap-4">
            <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-semibold text-navy">
              <Checkbox checked={form.announcementBannerEnabled} onChange={(e) => set('announcementBannerEnabled', e.target.checked)} />
              Announcement banner
            </label>
            <Field label="Announcement text" htmlFor="announcementBannerText">
              <Textarea id="announcementBannerText" value={form.announcementBannerText} onChange={(e) => set('announcementBannerText', e.target.value)} />
            </Field>
            <Field label="Emergency travel notice" htmlFor="emergencyTravelNotice">
              <Textarea id="emergencyTravelNotice" value={form.emergencyTravelNotice} onChange={(e) => set('emergencyTravelNotice', e.target.value)} />
            </Field>
            <Field label="Featured routes (one per line)" htmlFor="featuredRoutes">
              <Textarea id="featuredRoutes" value={featuredRoutesText} onChange={(e) => setFeaturedRoutesText(e.target.value)} />
            </Field>
          </div>
        </ConfigCard>

        <ConfigCard icon={Settings2} title="Chatbot Public Settings">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-semibold text-navy">
              <Checkbox checked={form.chatbotEnabled} onChange={(e) => set('chatbotEnabled', e.target.checked)} />
              Chatbot enabled
            </label>
            <Field label="Response tone" htmlFor="chatbotResponseTone">
              <Select id="chatbotResponseTone" value={form.chatbotResponseTone} onChange={(e) => set('chatbotResponseTone', e.target.value as PublicSiteConfig['chatbotResponseTone'])}>
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
                <option value="concise">Concise</option>
                <option value="playful">Playful</option>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Escalation contact" htmlFor="chatbotEscalationContact">
                <Input id="chatbotEscalationContact" value={form.chatbotEscalationContact} onChange={(e) => set('chatbotEscalationContact', e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Welcome message" htmlFor="chatbotWelcomeMessage">
                <Textarea id="chatbotWelcomeMessage" value={form.chatbotWelcomeMessage} onChange={(e) => set('chatbotWelcomeMessage', e.target.value)} />
              </Field>
            </div>
          </div>
        </ConfigCard>
      </div>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/70 bg-white/90 p-4 shadow-card backdrop-blur">
        <label className="flex items-center gap-3 text-sm font-semibold text-navy">
          <Checkbox checked={publishRemoteConfig} onChange={(e) => setPublishRemoteConfig(e.target.checked)} />
          Publish matching Remote Config keys
        </label>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save config
        </Button>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/70 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-lg bg-white p-5 shadow-card">
            <AlertTriangle className="size-8 text-amber-600" />
            <h2 className="mt-3 font-heading text-lg font-extrabold text-navy">Confirm configuration change</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This change may affect bookings, maintenance visibility, or live payment behavior.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" disabled={saving} onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button type="button" variant="navy" disabled={saving} onClick={() => persist(true)}>
                Confirm save
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
