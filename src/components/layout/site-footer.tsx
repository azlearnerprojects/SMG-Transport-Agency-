import Link from 'next/link';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { Logo } from './logo';
import { BRAND } from '@/lib/config';

const COLS = [
  {
    title: 'Travel',
    links: [
      { href: '/book', label: 'Book a Trip' },
      { href: '/routes', label: 'Routes & Schedules' },
      { href: '/fleet', label: 'Our Fleet' },
      { href: '/promotions', label: 'Promotions' },
      { href: '/manage', label: 'Manage Booking' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About SMG' },
      { href: '/faq', label: 'FAQs' },
      { href: '/contact', label: 'Contact' },
      { href: '/login', label: 'Customer Sign In' },
    ],
  },
  {
    title: 'Policies',
    links: [
      { href: '/policies/travel', label: 'Travel Policies' },
      { href: '/policies/cancellation', label: 'Cancellation & Refunds' },
      { href: '/terms', label: 'Terms & Conditions' },
      { href: '/privacy', label: 'Privacy Policy' },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t border-border bg-navy text-white/90">
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white/95 p-2 w-fit">
            <Logo />
          </div>
          <p className="mt-4 max-w-sm text-sm text-white/70">
            A youth-driven transport company making intercity travel across Ghana affordable,
            reliable and comfortable. {' '}
            <span className="text-white/50">(Contact details below are placeholders pending CEO approval.)</span>
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-gold" /> {BRAND.supportPhone}
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="size-4 text-gold" /> WhatsApp: {BRAND.whatsapp}
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-gold" /> {BRAND.email}
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 text-gold" /> {BRAND.office}
            </li>
          </ul>
        </div>

        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="font-heading text-sm font-bold uppercase tracking-wide text-gold">{col.title}</h4>
            <ul className="mt-4 space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/75 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-5 text-xs text-white/60 sm:flex-row">
          <p>© {year} {BRAND.name}. All rights reserved.</p>
          <div className="flex gap-4">
            <a href={BRAND.social.facebook} className="hover:text-white">Facebook</a>
            <a href={BRAND.social.instagram} className="hover:text-white">Instagram</a>
            <a href={BRAND.social.twitter} className="hover:text-white">X</a>
            <a href={BRAND.social.tiktok} className="hover:text-white">TikTok</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
