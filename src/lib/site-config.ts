import { z } from 'zod';
import { BRAND } from '@/lib/config';
import { getAdminFirestore } from '@/lib/firebase/admin';
import type { ChatbotRuntimeConfig, PublicSiteConfig } from '@/lib/types';

const nowIso = () => new Date().toISOString();

export const GHANA_CONTACT_REGEX = /^(\+233|0)[235][0-9]{8}$/;

export const chatbotTones = ['friendly', 'professional', 'concise', 'playful'] as const;

export const DEFAULT_PUBLIC_SITE_CONFIG: PublicSiteConfig = {
  siteName: BRAND.name,
  supportPhone: BRAND.supportPhone,
  supportWhatsapp: BRAND.whatsapp,
  supportEmail: BRAND.email,
  companyAddress: BRAND.office,
  bookingEnabled: true,
  maintenanceMode: false,
  bookingOpeningEnabled: true,
  cancellationWindowHours: 6,
  reschedulingWindowHours: 12,
  defaultCurrency: 'GHS',
  defaultTimezone: 'Africa/Accra',
  serviceFee: 5,
  taxPercentage: 0,
  featuredRoutes: ['Accra to Cape Coast', 'Cape Coast to Kumasi'],
  announcementBannerEnabled: false,
  announcementBannerText: '',
  emergencyTravelNotice: '',
  paymentGatewayMode: 'test',
  paystackPublicKey: '',
  smsProviderEnabled: false,
  emailProviderEnabled: false,
  chatbotEnabled: true,
  chatbotEscalationContact: BRAND.whatsapp,
  chatbotResponseTone: 'friendly',
  chatbotWelcomeMessage: 'Akwaaba! I can help with SMG routes, bookings, payments, cancellations, and support.',
  updatedAt: nowIso(),
};

export const DEFAULT_CHATBOT_RUNTIME_CONFIG: ChatbotRuntimeConfig = {
  enabled: true,
  modelName: process.env.VERTEX_AI_DEFAULT_MODEL ?? 'gemini-3.5-flash',
  temperature: 0.35,
  maxOutputTokens: 768,
  systemPromptVersion: 'smg-support-v1',
  welcomeMessage: DEFAULT_PUBLIC_SITE_CONFIG.chatbotWelcomeMessage,
  escalationEnabled: true,
  escalationWhatsapp: BRAND.whatsapp,
  responseTone: 'friendly',
  updatedAt: nowIso(),
};

const contact = z
  .string()
  .trim()
  .min(8)
  .max(24)
  .refine((value) => GHANA_CONTACT_REGEX.test(value.replace(/\s+/g, '')), {
    message: 'Use a valid Ghanaian phone number, e.g. +233543199401.',
  });

const text = (max = 300) => z.string().trim().max(max);

export const publicSiteConfigSchema = z.object({
  siteName: text(80).min(2),
  supportPhone: contact,
  supportWhatsapp: contact,
  supportEmail: z.string().trim().email(),
  companyAddress: text(240).min(4),
  bookingEnabled: z.boolean(),
  maintenanceMode: z.boolean(),
  bookingOpeningEnabled: z.boolean(),
  cancellationWindowHours: z.coerce.number().min(0).max(720),
  reschedulingWindowHours: z.coerce.number().min(0).max(720),
  defaultCurrency: z.string().trim().length(3).default('GHS'),
  defaultTimezone: z.string().trim().default('Africa/Accra'),
  serviceFee: z.coerce.number().min(0).max(1000),
  taxPercentage: z.coerce.number().min(0).max(100),
  featuredRoutes: z.array(text(90)).max(12),
  announcementBannerEnabled: z.boolean(),
  announcementBannerText: text(220),
  emergencyTravelNotice: text(300),
  paymentGatewayMode: z.enum(['test', 'live']),
  paystackPublicKey: z.string().trim().max(180),
  smsProviderEnabled: z.boolean(),
  emailProviderEnabled: z.boolean(),
  chatbotEnabled: z.boolean(),
  chatbotEscalationContact: contact,
  chatbotResponseTone: z.enum(chatbotTones),
  chatbotWelcomeMessage: text(260).min(8),
});

export const chatbotRuntimeConfigSchema = z.object({
  enabled: z.boolean(),
  modelName: z.string().trim().min(3).max(120),
  temperature: z.coerce.number().min(0).max(1),
  maxOutputTokens: z.coerce.number().int().min(128).max(4096),
  systemPromptVersion: z.string().trim().min(3).max(80),
  welcomeMessage: text(260).min(8),
  escalationEnabled: z.boolean(),
  escalationWhatsapp: contact,
  responseTone: z.enum(chatbotTones),
});

const g = globalThis as unknown as {
  __smgPublicSiteConfig?: PublicSiteConfig;
  __smgChatbotRuntimeConfig?: ChatbotRuntimeConfig;
};

function mergePublicConfig(data: Record<string, unknown> | undefined): PublicSiteConfig {
  return {
    ...DEFAULT_PUBLIC_SITE_CONFIG,
    ...(data ?? {}),
    updatedAt:
      typeof data?.updatedAt === 'string'
        ? data.updatedAt
        : DEFAULT_PUBLIC_SITE_CONFIG.updatedAt,
  } as PublicSiteConfig;
}

function mergeRuntimeConfig(data: Record<string, unknown> | undefined): ChatbotRuntimeConfig {
  return {
    ...DEFAULT_CHATBOT_RUNTIME_CONFIG,
    ...(data ?? {}),
    updatedAt:
      typeof data?.updatedAt === 'string'
        ? data.updatedAt
        : DEFAULT_CHATBOT_RUNTIME_CONFIG.updatedAt,
  } as ChatbotRuntimeConfig;
}

export async function getPublicSiteConfig(): Promise<{ configured: boolean; config: PublicSiteConfig }> {
  const firestore = await getAdminFirestore();
  if (!firestore) {
    g.__smgPublicSiteConfig ??= DEFAULT_PUBLIC_SITE_CONFIG;
    return { configured: false, config: g.__smgPublicSiteConfig };
  }

  const snap = await firestore.collection('siteConfig').doc('public').get();
  return { configured: true, config: mergePublicConfig(snap.data()) };
}

export async function updatePublicSiteConfig(
  patch: z.input<typeof publicSiteConfigSchema>,
  audit?: {
    uid?: string | null;
    email: string;
    previousValue: unknown;
  },
): Promise<{ configured: boolean; config: PublicSiteConfig }> {
  const parsed = publicSiteConfigSchema.parse(patch);
  const updated: PublicSiteConfig = { ...parsed, updatedAt: nowIso() };
  const firestore = await getAdminFirestore();

  if (!firestore) {
    g.__smgPublicSiteConfig = updated;
    return { configured: false, config: updated };
  }

  await firestore.collection('siteConfig').doc('public').set(updated, { merge: true });
  if (audit) {
    await firestore.collection('auditLogs').add({
      action: 'update_site_config',
      performedByUid: audit.uid ?? null,
      performedByEmail: audit.email,
      targetType: 'siteConfig',
      targetId: 'public',
      previousValue: audit.previousValue,
      newValue: updated,
      createdAt: updated.updatedAt,
    });
  }
  return { configured: true, config: updated };
}

export async function getChatbotRuntimeConfig(): Promise<{ configured: boolean; config: ChatbotRuntimeConfig }> {
  const firestore = await getAdminFirestore();
  if (!firestore) {
    g.__smgChatbotRuntimeConfig ??= DEFAULT_CHATBOT_RUNTIME_CONFIG;
    return { configured: false, config: g.__smgChatbotRuntimeConfig };
  }

  const snap = await firestore.collection('siteConfig').doc('private').get();
  return { configured: true, config: mergeRuntimeConfig(snap.data()?.chatbot as Record<string, unknown> | undefined) };
}

export async function updateChatbotRuntimeConfig(
  patch: z.input<typeof chatbotRuntimeConfigSchema>,
  audit?: {
    uid?: string | null;
    email: string;
    previousValue: unknown;
  },
): Promise<{ configured: boolean; config: ChatbotRuntimeConfig }> {
  const parsed = chatbotRuntimeConfigSchema.parse(patch);
  const updated: ChatbotRuntimeConfig = { ...parsed, updatedAt: nowIso() };
  const firestore = await getAdminFirestore();

  if (!firestore) {
    g.__smgChatbotRuntimeConfig = updated;
    return { configured: false, config: updated };
  }

  await firestore.collection('siteConfig').doc('private').set({ chatbot: updated, updatedAt: updated.updatedAt }, { merge: true });
  if (audit) {
    await firestore.collection('auditLogs').add({
      action: 'update_chatbot_runtime_config',
      performedByUid: audit.uid ?? null,
      performedByEmail: audit.email,
      targetType: 'siteConfig',
      targetId: 'private.chatbot',
      previousValue: audit.previousValue,
      newValue: updated,
      createdAt: updated.updatedAt,
    });
  }
  return { configured: true, config: updated };
}
