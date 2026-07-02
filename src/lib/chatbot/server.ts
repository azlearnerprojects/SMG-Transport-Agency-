import { DEMO_MODE } from '@/lib/config';
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
  if (DEMO_MODE) {
    const db = getDb();
    return {
      routes: db.listRoutes().map((route) => `${route.origin} to ${route.destination} (${Math.round(route.durationMinutes / 60)}h approx.)`),
      schedules: db
        .listSchedules()
        .slice(0, 8)
        .map((schedule) => {
          const route = db.getRoute(schedule.routeId);
          return route ? `${route.origin} to ${route.destination} on ${schedule.date} at ${schedule.departureTime}` : '';
        })
        .filter(Boolean),
      faqs: db.listFaqs().map((faq) => `${faq.question}: ${faq.answer}`),
      policies: [
        `Cancellations close ${db.settings.cancellationCutoffHours} hours before departure.`,
        `Rescheduling closes ${db.settings.reschedulingCutoffHours} hours before departure.`,
      ],
      announcements: db.listAnnouncements().map((item) => `${item.title}: ${item.body}`),
    };
  }

  const firestore = await getAdminFirestore();
  if (!firestore) {
    return { routes: [], schedules: [], faqs: [], policies: [], announcements: [] };
  }

  const [routes, schedules, faqs, policies, announcements] = await Promise.all([
    firestore.collection('routes').limit(12).get(),
    firestore.collection('schedules').limit(12).get(),
    firestore.collection('faqs').limit(12).get(),
    firestore.collection('policies').limit(8).get(),
    firestore.collection('announcements').limit(6).get(),
  ]);

  return {
    routes: routes.docs.filter((doc) => doc.get('active') !== false).map((doc) => {
      const data = doc.data();
      return `${data.origin ?? data.departureCity ?? 'Unknown'} to ${data.destination ?? data.destinationCity ?? 'Unknown'}${data.baseFare ? `, from GHS ${data.baseFare}` : ''}`;
    }),
    schedules: schedules.docs.filter((doc) => doc.get('active') !== false).map((doc) => {
      const data = doc.data();
      return `${data.routeId ?? 'Route'} departs ${data.departureTime ?? 'time TBC'}${data.availableSeats !== undefined ? `, ${data.availableSeats} seats available` : ''}`;
    }),
    faqs: faqs.docs.filter((doc) => doc.get('active') !== false).map((doc) => {
      const data = doc.data();
      return `${data.question ?? 'FAQ'}: ${data.answer ?? ''}`;
    }),
    policies: policies.docs.filter((doc) => doc.get('active') !== false).map((doc) => {
      const data = doc.data();
      return `${data.title ?? data.category ?? 'Policy'}: ${data.body ?? ''}`;
    }),
    announcements: announcements.docs.filter((doc) => doc.get('active') !== false).map((doc) => {
      const data = doc.data();
      return `${data.title ?? 'Announcement'}: ${data.body ?? ''}`;
    }),
  };
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
