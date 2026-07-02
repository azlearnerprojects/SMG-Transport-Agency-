'use client';

import { useMemo, useState } from 'react';
import { Bot, CheckCircle2, FilePlus2, Loader2, Play, Save, Search, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, Checkbox, Field } from '@/components/ui/misc';
import type { ChatbotRuntimeConfig } from '@/lib/types';
import type { AdminChatSessionSummary } from '@/lib/chatbot/admin';

interface KnowledgeDraft {
  type: 'faq' | 'policy';
  question: string;
  answer: string;
  title: string;
  body: string;
  category: string;
}

function sessionVariant(status: string) {
  if (status === 'resolved') return 'success';
  if (status === 'escalated') return 'warning';
  if (status === 'errored') return 'danger';
  return 'info';
}

export function ChatbotAdminClient({
  initial,
  configured,
  canEditModel,
  initialSessions,
}: {
  initial: ChatbotRuntimeConfig;
  configured: boolean;
  canEditModel: boolean;
  initialSessions: AdminChatSessionSummary[];
}) {
  const [form, setForm] = useState(initial);
  const [sessions, setSessions] = useState(initialSessions);
  const [query, setQuery] = useState('');
  const [publishRemoteConfig, setPublishRemoteConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger' | 'warning'; text: string } | null>(null);
  const [previewPrompt, setPreviewPrompt] = useState('What routes can I book with SMG?');
  const [preview, setPreview] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeDraft>({
    type: 'faq',
    question: '',
    answer: '',
    title: '',
    body: '',
    category: 'general',
  });
  const [addingKnowledge, setAddingKnowledge] = useState(false);

  const modelChanged = useMemo(
    () =>
      form.modelName !== initial.modelName ||
      form.temperature !== initial.temperature ||
      form.maxOutputTokens !== initial.maxOutputTokens ||
      form.systemPromptVersion !== initial.systemPromptVersion,
    [form.maxOutputTokens, form.modelName, form.systemPromptVersion, form.temperature, initial],
  );

  const filteredSessions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sessions.filter((session) => {
      if (!needle) return true;
      return (
        session.id.toLowerCase().includes(needle) ||
        session.status.toLowerCase().includes(needle) ||
        session.latestMessage.toLowerCase().includes(needle)
      );
    });
  }, [query, sessions]);

  function set<K extends keyof ChatbotRuntimeConfig>(key: K, value: ChatbotRuntimeConfig[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function persist(confirmModelChange = false) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, publishRemoteConfig, confirmModelChange }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ tone: res.status === 409 ? 'warning' : 'danger', text: json.error ?? 'Could not save chatbot config.' });
        if (res.status === 409) setConfirming(true);
        return;
      }
      setForm(json.data.config);
      const remote = json.data.remoteConfig?.published ? ' Remote Config published.' : '';
      setMessage({ tone: 'success', text: `Chatbot config saved.${remote}` });
      setConfirming(false);
    } catch {
      setMessage({ tone: 'danger', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (modelChanged) {
      setConfirming(true);
      return;
    }
    persist(false);
  }

  async function resolveSession(sessionId: string) {
    const res = await fetch(`/api/admin/chatbot/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage({ tone: 'danger', text: json.error ?? 'Could not resolve session.' });
      return;
    }
    setSessions((current) => current.map((session) => (session.id === sessionId ? { ...session, status: 'resolved' } : session)));
  }

  async function previewResponse() {
    setPreviewing(true);
    setPreview('');
    setMessage(null);
    try {
      const res = await fetch('/api/chatbot/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: previewPrompt,
          anonymousId: 'admin-preview',
          sessionId: `admin_preview_${Date.now()}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Preview failed.');
      setPreview(json.data.reply);
    } catch (err) {
      setMessage({ tone: 'danger', text: err instanceof Error ? err.message : 'Preview failed.' });
    } finally {
      setPreviewing(false);
    }
  }

  async function addKnowledge(event: React.FormEvent) {
    event.preventDefault();
    setAddingKnowledge(true);
    setMessage(null);
    const payload =
      knowledge.type === 'faq'
        ? {
            type: 'faq',
            question: knowledge.question,
            answer: knowledge.answer,
            category: knowledge.category,
          }
        : {
            type: 'policy',
            title: knowledge.title,
            body: knowledge.body,
            category: knowledge.category,
          };
    try {
      const res = await fetch('/api/admin/chatbot/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not add knowledge entry.');
      setMessage({ tone: 'success', text: `${knowledge.type === 'faq' ? 'FAQ' : 'Policy'} entry added.` });
      setKnowledge({ type: knowledge.type, question: '', answer: '', title: '', body: '', category: 'general' });
    } catch (err) {
      setMessage({ tone: 'danger', text: err instanceof Error ? err.message : 'Could not add knowledge entry.' });
    } finally {
      setAddingKnowledge(false);
    }
  }

  return (
    <div className="space-y-6">
      {!configured && (
        <Alert variant="warning" title="Firebase Admin SDK not configured">
          Chatbot admin data will use local demo fallbacks. Configure Firebase Admin credentials before production.
        </Alert>
      )}
      {message && <Alert variant={message.tone}>{message.text}</Alert>}

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <form onSubmit={submit} className="rounded-lg border border-white/70 bg-white/90 p-5 shadow-card backdrop-blur">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-navy text-gold">
                <Bot className="size-5" />
              </span>
              <div>
                <h2 className="font-heading text-lg font-extrabold text-navy">Runtime Settings</h2>
                <p className="text-xs text-muted-foreground">Remote Config compatible values for customer support.</p>
              </div>
            </div>
            <Badge variant={form.enabled ? 'success' : 'danger'}>{form.enabled ? 'Enabled' : 'Disabled'}</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-semibold text-navy">
              <Checkbox checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
              Chatbot enabled
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-semibold text-navy">
              <Checkbox checked={form.escalationEnabled} onChange={(e) => set('escalationEnabled', e.target.checked)} />
              Escalation enabled
            </label>
            <Field label="Welcome message" htmlFor="chatbotWelcome">
              <Textarea id="chatbotWelcome" value={form.welcomeMessage} onChange={(e) => set('welcomeMessage', e.target.value)} />
            </Field>
            <Field label="Escalation WhatsApp" htmlFor="chatbotEscalation">
              <Input id="chatbotEscalation" value={form.escalationWhatsapp} onChange={(e) => set('escalationWhatsapp', e.target.value)} />
            </Field>
            <Field label="Tone" htmlFor="chatbotTone">
              <Select id="chatbotTone" value={form.responseTone} onChange={(e) => set('responseTone', e.target.value as ChatbotRuntimeConfig['responseTone'])}>
                <option value="friendly">Friendly</option>
                <option value="professional">Professional</option>
                <option value="concise">Concise</option>
                <option value="playful">Playful</option>
              </Select>
            </Field>
          </div>

          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 size-5 text-amber-700" />
              <div>
                <p className="font-semibold text-amber-950">AI runtime controls</p>
                <p className="text-xs text-amber-900">
                  Model, prompt-version, temperature, and token settings require Super Admin access.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Model name" htmlFor="modelName">
                <Input id="modelName" value={form.modelName} disabled={!canEditModel} onChange={(e) => set('modelName', e.target.value)} />
              </Field>
              <Field label="System prompt version" htmlFor="systemPromptVersion">
                <Input id="systemPromptVersion" value={form.systemPromptVersion} disabled={!canEditModel} onChange={(e) => set('systemPromptVersion', e.target.value)} />
              </Field>
              <Field label="Temperature" htmlFor="temperature">
                <Input id="temperature" type="number" min="0" max="1" step="0.05" value={form.temperature} disabled={!canEditModel} onChange={(e) => set('temperature', Number(e.target.value))} />
              </Field>
              <Field label="Max output tokens" htmlFor="maxOutputTokens">
                <Input id="maxOutputTokens" type="number" min="128" max="4096" value={form.maxOutputTokens} disabled={!canEditModel} onChange={(e) => set('maxOutputTokens', Number(e.target.value))} />
              </Field>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-3 text-sm font-semibold text-navy">
              <Checkbox checked={publishRemoteConfig} onChange={(e) => setPublishRemoteConfig(e.target.checked)} />
              Publish Remote Config
            </label>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save chatbot
            </Button>
          </div>
        </form>

        <aside className="space-y-5">
          <section className="rounded-lg border border-border bg-white p-5 shadow-card">
            <h2 className="font-heading text-lg font-extrabold text-navy">Preview</h2>
            <Field label="Prompt" htmlFor="previewPrompt">
              <Textarea id="previewPrompt" value={previewPrompt} onChange={(e) => setPreviewPrompt(e.target.value)} />
            </Field>
            <Button type="button" className="mt-3" variant="navy" disabled={previewing} onClick={previewResponse}>
              {previewing ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Preview response
            </Button>
            {preview && <div className="mt-4 rounded-lg bg-muted p-3 text-sm text-navy">{preview}</div>}
          </section>

          <form onSubmit={addKnowledge} className="rounded-lg border border-border bg-white p-5 shadow-card">
            <h2 className="font-heading text-lg font-extrabold text-navy">Knowledge</h2>
            <div className="mt-4 grid gap-3">
              <Field label="Type" htmlFor="knowledgeType">
                <Select id="knowledgeType" value={knowledge.type} onChange={(e) => setKnowledge((current) => ({ ...current, type: e.target.value as KnowledgeDraft['type'] }))}>
                  <option value="faq">FAQ</option>
                  <option value="policy">Policy</option>
                </Select>
              </Field>
              <Field label="Category" htmlFor="knowledgeCategory">
                <Input id="knowledgeCategory" value={knowledge.category} onChange={(e) => setKnowledge((current) => ({ ...current, category: e.target.value }))} />
              </Field>
              {knowledge.type === 'faq' ? (
                <>
                  <Field label="Question" htmlFor="faqQuestion">
                    <Input id="faqQuestion" value={knowledge.question} onChange={(e) => setKnowledge((current) => ({ ...current, question: e.target.value }))} />
                  </Field>
                  <Field label="Answer" htmlFor="faqAnswer">
                    <Textarea id="faqAnswer" value={knowledge.answer} onChange={(e) => setKnowledge((current) => ({ ...current, answer: e.target.value }))} />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Title" htmlFor="policyTitle">
                    <Input id="policyTitle" value={knowledge.title} onChange={(e) => setKnowledge((current) => ({ ...current, title: e.target.value }))} />
                  </Field>
                  <Field label="Body" htmlFor="policyBody">
                    <Textarea id="policyBody" value={knowledge.body} onChange={(e) => setKnowledge((current) => ({ ...current, body: e.target.value }))} />
                  </Field>
                </>
              )}
              <Button type="submit" disabled={addingKnowledge}>
                {addingKnowledge ? <Loader2 className="size-4 animate-spin" /> : <FilePlus2 className="size-4" />}
                Add entry
              </Button>
            </div>
          </form>
        </aside>
      </div>

      <section className="rounded-lg border border-white/70 bg-white/90 p-5 shadow-card backdrop-blur">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-extrabold text-navy">Recent Conversations</h2>
            <p className="text-xs text-muted-foreground">Support agents can review and resolve chat sessions.</p>
          </div>
          <label className="relative block w-full sm:w-72">
            <span className="sr-only">Search conversations</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" placeholder="Search sessions" />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredSessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
              No chatbot conversations found yet.
            </div>
          ) : (
            filteredSessions.map((session) => (
              <article key={session.id} className="rounded-lg border border-border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy">{session.id}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{session.latestMessage}</p>
                  </div>
                  <Badge variant={sessionVariant(session.status)}>{session.status}</Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Updated {new Date(session.updatedAt).toLocaleString()}</p>
                {session.status !== 'resolved' && (
                  <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => resolveSession(session.id)}>
                    <CheckCircle2 className="size-4" />
                    Resolve
                  </Button>
                )}
              </article>
            ))
          )}
        </div>
      </section>

      {confirming && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/70 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-lg bg-white p-5 shadow-card">
            <ShieldAlert className="size-8 text-amber-600" />
            <h2 className="mt-3 font-heading text-lg font-extrabold text-navy">Confirm AI runtime change</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This will change model or prompt behavior used by production chatbot responses.
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
    </div>
  );
}
