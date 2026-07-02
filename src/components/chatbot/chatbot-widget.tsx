'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatSurface } from '@/components/chatbot/chat-surface';

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div id="smg-chatbot-widget" className="h-[min(620px,calc(100vh-6rem))] w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-white/70 bg-white shadow-card-hover sm:w-[390px]">
          <div className="flex items-center justify-end gap-1 border-b border-border bg-white px-3 py-2">
            <Link href="/support/chat" className="grid size-9 place-items-center rounded-md text-navy hover:bg-navy/5" aria-label="Open full chat page">
              <Maximize2 className="size-4" />
            </Link>
            <button
              type="button"
              className="grid size-9 place-items-center rounded-md text-navy hover:bg-navy/5"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              <X className="size-4" />
            </button>
          </div>
          <ChatSurface compact />
        </div>
      )}
      <Button
        type="button"
        size="lg"
        className="h-14 rounded-full px-5 shadow-card-hover"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="smg-chatbot-widget"
      >
        {open ? <X className="size-5" /> : <Bot className="size-5" />}
        {open ? 'Close' : 'Chat'}
      </Button>
    </div>
  );
}
