import type { Metadata } from 'next';
import { ChatSurface } from '@/components/chatbot/chat-surface';

export const metadata: Metadata = {
  title: 'Support Chat',
  description: 'Chat with SMG Transport Agency support for booking, route, payment, cancellation, and rescheduling help.',
};

export default function SupportChatPage() {
  return (
    <div className="bg-cloud py-10">
      <div className="container-page">
        <div className="mb-6 max-w-2xl">
          <h1 className="font-heading text-3xl font-extrabold text-navy">Support chat</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Get help with SMG bookings, routes, payments, cancellations, and rescheduling.
          </p>
        </div>
        <ChatSurface />
      </div>
    </div>
  );
}
