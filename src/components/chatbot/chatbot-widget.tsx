'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Maximize2, MessageCircle, X } from 'lucide-react';
import { ChatSurface } from '@/components/chatbot/chat-surface';

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (pathname?.startsWith('/admin')) return null;

  return (
    // Single launcher, pinned bottom-right, above all page content and honouring
    // device safe-area insets so it never sits under a home indicator or notch.
    <div
      className="fixed z-50 flex flex-col items-end gap-3"
      style={{
        right: 'max(1rem, env(safe-area-inset-right))',
        bottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      {open && (
        <div
          id="smg-chatbot-widget"
          role="dialog"
          aria-label="SMG support chat"
          className="flex h-[min(70vh,32rem)] w-[min(calc(100vw-2rem),24rem)] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-card-hover"
        >
          <div className="flex shrink-0 items-center justify-between gap-1 border-b border-border bg-navy px-3 py-2 text-white">
            <span className="flex items-center gap-2 pl-1 text-sm font-semibold">
              <MessageCircle className="size-4" aria-hidden /> SMG Assistant
            </span>
            <div className="flex items-center gap-1">
              <Link
                href="/support/chat"
                className="grid size-8 place-items-center rounded-md text-white/90 hover:bg-white/10"
                aria-label="Open full chat page"
              >
                <Maximize2 className="size-4" />
              </Link>
              <button
                type="button"
                className="grid size-8 place-items-center rounded-md text-white/90 hover:bg-white/10"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
          {/* min-h-0 lets the chat surface shrink inside the flex column so its
              input bar stays visible instead of being clipped by overflow-hidden. */}
          <div className="min-h-0 flex-1">
            <ChatSurface compact />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="smg-chatbot-widget"
        aria-label={open ? 'Close chat' : 'Open SMG support chat'}
        className="grid size-14 place-items-center rounded-full bg-navy text-white shadow-card-hover transition-transform hover:-translate-y-0.5 hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>
    </div>
  );
}
