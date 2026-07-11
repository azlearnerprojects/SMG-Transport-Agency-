'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Building2, CheckCircle2, CreditCard, Home, Loader2, Megaphone, Save, Settings2, Share2, XCircle } from 'lucide-react';
import { Alert, Checkbox, Field } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ProductionReadinessCheck, ProductionReadinessSummary, PublicSiteConfig } from '@/lib/types';

function routesToText(routes: string[]) {
  return routes.join('\n');
}

function textToRoutes(value: string) {
  return value
    .split(/\r?\n/)
    .map((route) => route.trim())
    .filter(Boolean);
}

function listToText(items: string[]) {
  return items.join('\n');
}

function textToList(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function benefitsToText(items: PublicSiteConfig['homeBenefits']) {
  return items.map((item) => `${item.title} | ${item.body}`).join('\n');
}

function textToBenefits(value: string): PublicSiteConfig['homeBenefits'] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawTitle = '', ...bodyParts] = line.split('|');
      const title = rawTitle.trim();
      const body = bodyParts.join('|').trim();
      return {
        title,
        body: body || title,
      };
    });
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

function readinessTone(readiness: ProductionReadinessSummary): 'success' | 'warning' | 'danger' {
  if (readiness.counts.fail > 0) return 'danger';
  if (readiness.counts.warning > 0) return 'warning';
  return 'success';
}

function ReadinessItem({ check }: { check: ProductionReadinessCheck }) {
  const Icon = check.status === 'fail' ? XCircle : AlertTriangle;
  const tone = check.status === 'fail' ? 'text-red-700' : 'text-amber-700';
  const border = check.status === 'fail' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50';
  return (
    <li className={`rounded-md border p-3 ${border}`}>
      <div className="flex items-start gap-2">
        <Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} />
        <div>
          <p className="text-sm font-semibold text-navy">{check.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{check.message}</p>
          {check.help && <p className="mt-1 text-xs font-medium text-navy/80">{check.help}</p>}
        </div>
      </div>
    </li>
  );
}

function ProductionReadinessPanel({ readiness }: { readiness: ProductionReadinessSummary }) {
  const attention = readiness.checks.filter((check) => check.status !== 'pass');
  const ready = readiness.ready && readiness.counts.warning === 0;
  return (
    <section className="rounded-lg border border-white/70 bg-white/90 p-5 shadow-card backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-navy/5 text-navy">
            {ready ? <CheckCircle2 className="size-5 text-green-700" /> : <AlertTriangle className="size-5 text-amber-700" />}
          </span>
          <div>
            <h2 className="font-heading text-lg font-extrabold text-navy">Production Readiness</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {readiness.counts.pass} pass, {readiness.counts.warning} warning, {readiness.counts.fail} fail.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-navy px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          {readiness.ready ? 'No blockers' : 'Blocked'}
        </span>
      </div>

      <Alert variant={readinessTone(readiness)} className="mt-4">
        {readiness.ready
          ? readiness.counts.warning > 0
            ? 'No blocking checks failed, but resolve warnings before launch if they affect the go-live plan.'
            : 'No local production readiness blockers were found.'
          : 'Resolve failed checks before deploying or switching production traffic.'}
      </Alert>

      {attention.length > 0 && (
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {attention.map((check) => (
            <ReadinessItem key={check.id} check={check} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function AdminConfigClient({
  initial,
  configured,
  readiness: initialReadiness,
}: {
  initial: PublicSiteConfig;
  configured: boolean;
  readiness: ProductionReadinessSummary;
}) {
  const [form, setForm] = useState(initial);
  const [readiness, setReadiness] = useState(initialReadiness);
  const [featuredRoutesText, setFeaturedRoutesText] = useState(routesToText(initial.featuredRoutes));
  const [homeHighlightsText, setHomeHighlightsText] = useState(listToText(initial.homeHighlights));
  const [homeBenefitsText, setHomeBenefitsText] = useState(benefitsToText(initial.homeBenefits));
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
          homeHighlights: textToList(homeHighlightsText),
          homeBenefits: textToBenefits(homeBenefitsText),
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
      if (json.data.readiness) setReadiness(json.data.readiness);
      setFeaturedRoutesText(routesToText(json.data.config.featuredRoutes));
      setHomeHighlightsText(listToText(json.data.config.homeHighlights));
      setHomeBenefitsText(benefitsToText(json.data.config.homeBenefits));
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
      <ProductionReadinessPanel readiness={readiness} />

      {!configured && (
        <Alert variant="warning" title="Firebase Admin SDK not configured">
          Changes will use the local demo fallback only. Configure server Firebase credentials before production.
        </Alert>
      )}
      {message && <Alert variant={message.tone}>{message.text}</Alert>}

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="xl:col-span-2">
          <ConfigCard icon={Home} title="Landing Page">
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Hero eyebrow" htmlFor="homeEyebrow" required>
                <Input id="homeEyebrow" value={form.homeEyebrow} onChange={(e) => set('homeEyebrow', e.target.value)} />
              </Field>
              <Field label="Hero headline" htmlFor="tagline" required>
                <Input id="tagline" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
              </Field>
              <div className="lg:col-span-2">
                <Field label="Hero intro" htmlFor="homeIntro" required>
                  <Textarea id="homeIntro" value={form.homeIntro} onChange={(e) => set('homeIntro', e.target.value)} />
                </Field>
              </div>
              <Field label="Highlights (one per line)" htmlFor="homeHighlights">
                <Textarea id="homeHighlights" value={homeHighlightsText} onChange={(e) => setHomeHighlightsText(e.target.value)} />
              </Field>
              <Field label="Popular routes title" htmlFor="homeRoutesTitle" required>
                <Input id="homeRoutesTitle" value={form.homeRoutesTitle} onChange={(e) => set('homeRoutesTitle', e.target.value)} />
              </Field>
              <Field label="Popular routes intro" htmlFor="homeRoutesIntro">
                <Textarea id="homeRoutesIntro" value={form.homeRoutesIntro} onChange={(e) => set('homeRoutesIntro', e.target.value)} />
              </Field>
              <Field label="Benefits title" htmlFor="homeBenefitsTitle" required>
                <Input id="homeBenefitsTitle" value={form.homeBenefitsTitle} onChange={(e) => set('homeBenefitsTitle', e.target.value)} />
              </Field>
              <div className="lg:col-span-2">
                <Field label="Benefits (Title | Body, one per line)" htmlFor="homeBenefits" required>
                  <Textarea id="homeBenefits" value={homeBenefitsText} onChange={(e) => setHomeBenefitsText(e.target.value)} />
                </Field>
              </div>
              <Field label="FAQ title" htmlFor="homeFaqTitle" required>
                <Input id="homeFaqTitle" value={form.homeFaqTitle} onChange={(e) => set('homeFaqTitle', e.target.value)} />
              </Field>
              <Field label="FAQ intro" htmlFor="homeFaqIntro">
                <Input id="homeFaqIntro" value={form.homeFaqIntro} onChange={(e) => set('homeFaqIntro', e.target.value)} />
              </Field>
              <Field label="Support title" htmlFor="homeSupportTitle" required>
                <Input id="homeSupportTitle" value={form.homeSupportTitle} onChange={(e) => set('homeSupportTitle', e.target.value)} />
              </Field>
              <Field label="Support body" htmlFor="homeSupportBody" required>
                <Textarea id="homeSupportBody" value={form.homeSupportBody} onChange={(e) => set('homeSupportBody', e.target.value)} />
              </Field>
            </div>
          </ConfigCard>
        </div>

        <ConfigCard icon={Building2} title="Company">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Site name" htmlFor="siteName" required>
              <Input id="siteName" value={form.siteName} onChange={(e) => set('siteName', e.target.value)} />
            </Field>
            <Field label="Support email" htmlFor="supportEmail" required>
              <Input id="supportEmail" type="email" value={form.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} />
            </Field>
            <Field label="Support hours" htmlFor="supportHours" required>
              <Input id="supportHours" value={form.supportHours} onChange={(e) => set('supportHours', e.target.value)} placeholder="e.g. 24/7 or 6am - 9pm" />
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

        <ConfigCard icon={Share2} title="Social Links">
          <p className="mb-4 text-xs text-muted-foreground">
            Shown in the footer and contact page. Leave a field empty to hide that network.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Facebook" htmlFor="socialFacebook">
              <Input id="socialFacebook" value={form.socialFacebook} onChange={(e) => set('socialFacebook', e.target.value)} placeholder="https://facebook.com/..." />
            </Field>
            <Field label="Instagram" htmlFor="socialInstagram">
              <Input id="socialInstagram" value={form.socialInstagram} onChange={(e) => set('socialInstagram', e.target.value)} placeholder="https://instagram.com/..." />
            </Field>
            <Field label="X (Twitter)" htmlFor="socialTwitter">
              <Input id="socialTwitter" value={form.socialTwitter} onChange={(e) => set('socialTwitter', e.target.value)} placeholder="https://x.com/..." />
            </Field>
            <Field label="TikTok" htmlFor="socialTiktok">
              <Input id="socialTiktok" value={form.socialTiktok} onChange={(e) => set('socialTiktok', e.target.value)} placeholder="https://tiktok.com/@..." />
            </Field>
          </div>
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
