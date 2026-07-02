'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, MessageCircle, RefreshCw, Send, TriangleAlert } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/misc';
import { getFirebaseAuth, getFirebaseFunctions } from '@/lib/firebase/client';
import { useCustomerAuth } from '@/lib/auth/customer-auth';
import type { PublicSiteConfig } from '@/lib/types';

interface ChatLine {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AskResponse {
  reply: string;
  sessionId: string;
  disabled?: boolean;
  escalationContact?: string;
}

const DEFAULT_WELCOME = 'Akwaaba! I can help with SMG routes, bookings, payments, cancellations, and support.';
const ANON_KEY = 'smg_chat_anon_id';
const SESSION_KEY = 'smg_chat_session_id';

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

async function loadPublicConfig(): Promise<PublicSiteConfig | null> {
  const res = await fetch('/api/config/public', { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data?.config ?? null;
}

export function ChatSurface({ compact = false }: { compact?: boolean }) {
  const { user } = useCustomerAuth();
  const [config, setConfig] = useState<PublicSiteConfig | null>(null);
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [anonymousId, setAnonymousId] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const welcome = config?.chatbotWelcomeMessage || DEFAULT_WELCOME;
  const contact = config?.chatbotEscalationContact || '+233543199401';
  const chatbotEnabled = config?.chatbotEnabled ?? true;

  useEffect(() => {
    let cancelled = false;
    loadPublicConfig()
      .then((next) => {
        if (!cancelled) setConfig(next);
      })
      .catch(() => undefined);

    try {
      let anon = localStorage.getItem(ANON_KEY);
      if (!anon) {
        anon = uid('anon');
        localStorage.setItem(ANON_KEY, anon);
      }
      setAnonymousId(anon);
      setSessionId(localStorage.getItem(SESSION_KEY) ?? undefined);
    } catch {
      setAnonymousId(uid('anon'));
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const seededMessages = useMemo<ChatLine[]>(() => {
    if (messages.length > 0) return messages;
    return [{ id: 'welcome', role: 'assistant', content: welcome }];
  }, [messages, welcome]);

  async function askBackend(message: string): Promise<AskResponse> {
    const payload = { message, sessionId, anonymousId };
    const shouldUseCallable = process.env.NEXT_PUBLIC_USE_FIREBASE_CHATBOT === 'true';

    if (shouldUseCallable) {
      const functions = await getFirebaseFunctions();
      if (functions) {
        const callable = httpsCallable<typeof payload, AskResponse>(functions, 'askChatbot');
        const result = await callable(payload);
        return result.data;
      }
    }

    const auth = await getFirebaseAuth();
    const token = await auth?.currentUser?.getIdToken().catch(() => undefined);
    const res = await fetch('/api/chatbot/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Chat failed.');
    return json.data;
  }

  async function sendMessage(message = input) {
    const clean = message.trim();
    if (!clean || sending) return;
    setInput('');
    setError(null);
    setLastMessage(clean);
    setMessages((current) => [...current, { id: uid('user'), role: 'user', content: clean }]);
    setSending(true);

    try {
      const response = await askBackend(clean);
      setMessages((current) => [...current, { id: uid('assistant'), role: 'assistant', content: response.reply }]);
      setSessionId(response.sessionId);
      try {
        localStorage.setItem(SESSION_KEY, response.sessionId);
      } catch {
        /* best effort */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed. Please try again.');
    } finally {
      setSending(false);
    }
  }

  function resetConversation() {
    setMessages([{ id: uid('assistant'), role: 'assistant', content: welcome }]);
    setSessionId(undefined);
    setError(null);
    setLastMessage(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* best effort */
    }
  }

  return (
    <section className={compact ? 'flex h-full flex-col' : 'mx-auto flex min-h-[68vh] max-w-4xl flex-col rounded-lg border border-border bg-white shadow-card'}>
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-navy text-gold">
            <Bot className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate font-heading text-base font-extrabold text-navy">SMG Support Chat</h2>
            <p className="truncate text-xs text-muted-foreground">
              {chatbotEnabled ? 'Online' : 'Offline'} {user ? `- ${user.displayName}` : '- Guest'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="icon" variant="ghost" onClick={resetConversation} aria-label="Reset conversation">
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>

      {!chatbotEnabled && (
        <Alert variant="warning" className="m-4">
          Chat support is offline. WhatsApp support is still available.
        </Alert>
      )}

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {seededMessages.map((message) => (
          <div
            key={message.id}
            className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            <div
              className={
                message.role === 'user'
                  ? 'max-w-[85%] rounded-lg bg-navy px-4 py-3 text-sm text-white'
                  : 'max-w-[85%] rounded-lg border border-border bg-muted px-4 py-3 text-sm text-navy'
              }
            >
              {message.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Typing...
          </div>
        )}
      </div>

      {error && (
        <div className="px-4">
          <Alert variant="danger">
            <span className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 size-4" />
              <span className="min-w-0">
                {error}
                {lastMessage && (
                  <button type="button" className="ml-2 font-semibold underline" onClick={() => sendMessage(lastMessage)}>
                    Retry
                  </button>
                )}
              </span>
            </span>
          </Alert>
        </div>
      )}

      <form
        className="border-t border-border p-4"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage();
        }}
      >
        <label htmlFor={compact ? 'chat-widget-message' : 'chat-page-message'} className="sr-only">
          Message
        </label>
        <Textarea
          id={compact ? 'chat-widget-message' : 'chat-page-message'}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about routes, bookings, payments, or cancellations"
          rows={compact ? 2 : 3}
          disabled={sending}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <a
            href={`https://wa.me/${contact.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-navy/20 bg-white px-3 text-sm font-semibold text-navy hover:bg-navy/5"
          >
            <MessageCircle className="size-4" /> WhatsApp
          </a>
          <Button type="submit" disabled={sending || !input.trim()}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send
          </Button>
        </div>
      </form>
    </section>
  );
}
