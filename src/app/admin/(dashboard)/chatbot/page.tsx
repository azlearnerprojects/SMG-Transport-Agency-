import type { Metadata } from 'next';
import { AdminPageTitle, RestrictedNotice } from '@/components/admin/admin-ui';
import { ChatbotAdminClient } from '@/components/admin/chatbot-admin-client';
import { getStaffSession, roleAllowed } from '@/lib/auth/session';
import { listRecentChatSessions } from '@/lib/chatbot/admin';
import { getChatbotRuntimeConfig } from '@/lib/site-config';

export const metadata: Metadata = { title: 'Admin - Chatbot' };

export default async function AdminChatbotPage() {
  const session = await getStaffSession();
  if (!roleAllowed(session, ['customer_support', 'support_agent'])) {
    return <RestrictedNotice module="Chatbot" />;
  }

  const [runtime, recent] = await Promise.all([
    getChatbotRuntimeConfig(),
    listRecentChatSessions(),
  ]);

  return (
    <>
      <AdminPageTitle
        title="Chatbot"
        description="Control support chat behavior, escalation, knowledge entries, and AI runtime settings."
      />
      <ChatbotAdminClient
        initial={runtime.config}
        configured={runtime.configured && recent.configured}
        canEditModel={session?.role === 'super_admin'}
        initialSessions={recent.sessions}
      />
    </>
  );
}
