import { getAdminApp } from '@/lib/firebase/admin';
import type { ChatbotRuntimeConfig, PublicSiteConfig } from '@/lib/types';

export const REMOTE_CONFIG_KEYS = {
  chatbotEnabled: 'chatbot_enabled',
  chatbotModelName: 'chatbot_model_name',
  chatbotTemperature: 'chatbot_temperature',
  chatbotMaxOutputTokens: 'chatbot_max_output_tokens',
  chatbotSystemPromptVersion: 'chatbot_system_prompt_version',
  chatbotWelcomeMessage: 'chatbot_welcome_message',
  chatbotEscalationEnabled: 'chatbot_escalation_enabled',
  chatbotEscalationWhatsapp: 'chatbot_escalation_whatsapp',
  bookingEnabled: 'booking_enabled',
  maintenanceMode: 'maintenance_mode',
  enableSeatSelection: 'enable_seat_selection',
  enableOnlinePayments: 'enable_online_payments',
  enableRescheduling: 'enable_rescheduling',
  enableCancellations: 'enable_cancellations',
  featuredRoutes: 'featured_routes',
  announcementBannerEnabled: 'announcement_banner_enabled',
  announcementBannerText: 'announcement_banner_text',
} as const;

type RemoteConfigPatch = Record<string, string | number | boolean>;

export function remoteConfigPatchFromSiteConfig(config: PublicSiteConfig): RemoteConfigPatch {
  return {
    [REMOTE_CONFIG_KEYS.bookingEnabled]: config.bookingEnabled,
    [REMOTE_CONFIG_KEYS.maintenanceMode]: config.maintenanceMode,
    [REMOTE_CONFIG_KEYS.enableSeatSelection]: true,
    [REMOTE_CONFIG_KEYS.enableOnlinePayments]: config.paymentGatewayMode === 'live' || config.paymentGatewayMode === 'test',
    [REMOTE_CONFIG_KEYS.enableRescheduling]: config.reschedulingWindowHours > 0,
    [REMOTE_CONFIG_KEYS.enableCancellations]: config.cancellationWindowHours > 0,
    [REMOTE_CONFIG_KEYS.featuredRoutes]: JSON.stringify(config.featuredRoutes),
    [REMOTE_CONFIG_KEYS.announcementBannerEnabled]: config.announcementBannerEnabled,
    [REMOTE_CONFIG_KEYS.announcementBannerText]: config.announcementBannerText,
    [REMOTE_CONFIG_KEYS.chatbotEnabled]: config.chatbotEnabled,
    [REMOTE_CONFIG_KEYS.chatbotWelcomeMessage]: config.chatbotWelcomeMessage,
    [REMOTE_CONFIG_KEYS.chatbotEscalationWhatsapp]: config.chatbotEscalationContact,
  };
}

export function remoteConfigPatchFromChatbotConfig(config: ChatbotRuntimeConfig): RemoteConfigPatch {
  return {
    [REMOTE_CONFIG_KEYS.chatbotEnabled]: config.enabled,
    [REMOTE_CONFIG_KEYS.chatbotModelName]: config.modelName,
    [REMOTE_CONFIG_KEYS.chatbotTemperature]: config.temperature,
    [REMOTE_CONFIG_KEYS.chatbotMaxOutputTokens]: config.maxOutputTokens,
    [REMOTE_CONFIG_KEYS.chatbotSystemPromptVersion]: config.systemPromptVersion,
    [REMOTE_CONFIG_KEYS.chatbotWelcomeMessage]: config.welcomeMessage,
    [REMOTE_CONFIG_KEYS.chatbotEscalationEnabled]: config.escalationEnabled,
    [REMOTE_CONFIG_KEYS.chatbotEscalationWhatsapp]: config.escalationWhatsapp,
  };
}

export async function publishRemoteConfigPatch(
  patch: RemoteConfigPatch,
  description: string,
): Promise<{ published: boolean; reason?: string }> {
  const app = await getAdminApp();
  if (!app) return { published: false, reason: 'Firebase Admin SDK is not configured.' };

  const { getRemoteConfig } = await import('firebase-admin/remote-config');
  const remoteConfig = getRemoteConfig(app);
  const template = await remoteConfig.getTemplate();

  for (const [key, value] of Object.entries(patch)) {
    template.parameters[key] = {
      defaultValue: { value: String(value) },
      description,
    };
  }

  await remoteConfig.publishTemplate(template);
  return { published: true };
}
