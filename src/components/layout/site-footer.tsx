import Link from 'next/link';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { Logo } from './logo';
import { getPublicSiteConfig } from '@/lib/site-config';

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

export async function SiteFooter() {
  const year = new Date().getFullYear();
  const { config: site } = await getPublicSiteConfig();
  const socials = [
    { label: 'Facebook', href: site.socialFacebook },
    { label: 'Instagram', href: site.socialInstagram },
    { label: 'X', href: site.socialTwitter },
    { label: 'TikTok', href: site.socialTiktok },
  ].filter((s) => s.href);

  return (
    <footer className="mt-20 border-t border-border bg-navy text-white/90">
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="rounded-lg bg-white/95 p-2 w-fit">
            <Logo />
          </div>
          <p className="mt-4 max-w-sm text-sm text-white/70">
            {site.homeIntro}
          </p>
          <ul className="mt-5 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-gold" /> {site.supportPhone}
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="size-4 text-gold" /> WhatsApp: {site.supportWhatsapp}
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-gold" /> {site.supportEmail}
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 text-gold" /> {site.companyAddress}
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 size-4 rounded-full bg-gold" aria-hidden /> Support: {site.supportHours}
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
          <p>© {year} {site.siteName}. All rights reserved.</p>
          {socials.length > 0 && (
            <div className="flex gap-4">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="hover:text-white">
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
