import { getDb } from '@/lib/db';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { generateId } from '@/lib/ids';
import { getChatbotRuntimeConfig, getPublicSiteConfig } from '@/lib/site-config';

export interface ChatbotRequest {
  message: string;
  sessionId?: string;
  uid?: string;
  anonymousId?: string;
}

export interface ChatbotResponse {
  reply: string;
  sessionId: string;
  disabled: boolean;
  escalationContact?: string;
}

interface KnowledgeContext {
  routes: string[];
  schedules: string[];
  faqs: string[];
  policies: string[];
  announcements: string[];
}

function cleanMessage(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 1200);
}

async function loadKnowledge(): Promise<KnowledgeContext> {
  try {
    const db = getDb();
    const [routes, schedules, faqs, settings, announcements] = await Promise.all([
      db.listRoutes(),
      db.listSchedules(),
      db.listFaqs(),
      db.getSettings(),
      db.listAnnouncements(),
    ]);
    const routeById = new Map(routes.map((route) => [route.id, route]));
    const today = new Date().toISOString().slice(0, 10);
    return {
      routes: routes.map((route) => `${route.origin} to ${route.destination} (${Math.round(route.durationMinutes / 60)}h approx.)`),
      schedules: schedules
        .filter((schedule) => schedule.status === 'scheduled' && schedule.date >= today)
        .slice(0, 8)
        .map((schedule) => {
          const route = routeById.get(schedule.routeId);
          return route ? `${route.origin} to ${route.destination} on ${schedule.date} at ${schedule.departureTime}` : '';
        })
        .filter(Boolean),
      faqs: faqs.map((faq) => `${faq.question}: ${faq.answer}`),
      policies: [
        `Cancellations close ${settings.cancellationCutoffHours} hours before departure.`,
        `Rescheduling closes ${settings.reschedulingCutoffHours} hours before departure.`,
      ],
      announcements: announcements.map((item) => `${item.title}: ${item.body}`),
    };
  } catch {
    // Knowledge is best-effort: the chatbot still answers with escalation info.
    return { routes: [], schedules: [], faqs: [], policies: [], announcements: [] };
  }
}

function formatContext(context: KnowledgeContext): string {
  const section = (title: string, items: string[]) =>
    items.length ? `${title}:\n- ${items.join('\n- ')}` : `${title}: Not available yet.`;
  return [
    section('Routes', context.routes),
    section('Schedules', context.schedules),
    section('FAQs', context.faqs),
    section('Policies', context.policies),
    section('Announcements', context.announcements),
  ].join('\n\n');
}

function deterministicReply(message: string, context: KnowledgeContext, supportContact: string): string {
  const lower = message.toLowerCase();
  if (context.routes.length === 0 && context.schedules.length === 0 && context.faqs.length === 0) {
    return `I do not have verified SMG route, schedule, or policy data available yet. Please contact support on ${supportContact} so the team can help you directly.`;
  }

  if (lower.includes('route') || lower.includes('where') || lower.includes('destination')) {
    return `Here are the verified routes I can see right now: ${context.routes.slice(0, 5).join('; ')}. For exact departure availability, use the booking search or contact support on ${supportContact}.`;
  }
  if (lower.includes('schedule') || lower.includes('time') || lower.includes('depart')) {
    const schedules = context.schedules.slice(0, 5);
    if (!schedules.length) return `I do not have verified schedules available yet. Please contact support on ${supportContact}.`;
    return `These are the schedule entries I can verify: ${schedules.join('; ')}. Please confirm live availability during checkout before paying.`;
  }
  if (lower.includes('cancel') || lower.includes('refund')) {
    return `For cancellations and refunds, I can only follow published SMG policy. ${context.policies.slice(0, 2).join(' ')} If your trip is urgent, contact support on ${supportContact}.`;
  }
  if (lower.includes('reschedule')) {
    return `Rescheduling depends on your ticket status and the active travel policy. ${context.policies.slice(0, 2).join(' ')} Use Manage Booking or contact support on ${supportContact}.`;
  }
  if (lower.includes('pay') || lower.includes('momo') || lower.includes('mobile money')) {
    return 'SMG payments should be completed only through the secure checkout flow. Never share your card PIN, Mobile Money PIN, password, or OTP with anyone.';
  }

  return `I can help with SMG routes, schedules, booking steps, payments, cancellations, and rescheduling. I have this verified context available:\n\n${formatContext(context).slice(0, 900)}\n\nFor anything not listed, please contact support on ${supportContact}.`;
}

async function saveChatMessage(params: {
  sessionId: string;
  uid?: string;
  anonymousId?: string;
  userMessage: string;
  assistantMessage: string;
  status?: 'open' | 'errored';
}) {
  const firestore = await getAdminFirestore();
  if (!firestore) return;

  const now = new Date().toISOString();
  const sessionRef = firestore.collection('chatSessions').doc(params.sessionId);
  await sessionRef.set(
    {
      uid: params.uid ?? null,
      anonymousId: params.anonymousId ?? null,
      status: params.status ?? 'open',
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
  await sessionRef.collection('messages').add({
    sessionId: params.sessionId,
    role: 'user',
    content: params.userMessage,
    createdAt: now,
    status: 'sent',
  });
  await sessionRef.collection('messages').add({
    sessionId: params.sessionId,
    role: 'assistant',
    content: params.assistantMessage,
    createdAt: now,
    status: 'sent',
  });
}

export async function askLocalChatbot(input: ChatbotRequest): Promise<ChatbotResponse> {
  const message = cleanMessage(input.message);
  if (!message) {
    throw new Error('Message is required.');
  }

  const [{ config: publicConfig }, { config: runtimeConfig }] = await Promise.all([
    getPublicSiteConfig(),
    getChatbotRuntimeConfig(),
  ]);
  const enabled = publicConfig.chatbotEnabled && runtimeConfig.enabled;
  const sessionId = input.sessionId?.trim() || generateId('chat');
  const escalationContact = runtimeConfig.escalationWhatsapp || publicConfig.chatbotEscalationContact;

  if (!enabled) {
    const reply = `SMG chat support is currently offline. Please contact support on ${escalationContact}.`;
    await saveChatMessage({
      sessionId,
      uid: input.uid,
      anonymousId: input.anonymousId,
      userMessage: message,
      assistantMessage: reply,
    });
    return { reply, sessionId, disabled: true, escalationContact };
  }

  const knowledge = await loadKnowledge();
  const reply = deterministicReply(message, knowledge, escalationContact);
  await saveChatMessage({
    sessionId,
    uid: input.uid,
    anonymousId: input.anonymousId,
    userMessage: message,
    assistantMessage: reply,
  });

  return { reply, sessionId, disabled: false, escalationContact };
}
