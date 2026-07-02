import type { Metadata } from 'next';
import { Montserrat, Open_Sans } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { ChromeGate } from '@/components/layout/chrome-gate';
import { DemoBadge } from '@/components/layout/demo-badge';
import { CustomerAuthProvider } from '@/lib/auth/customer-auth';
import { APP_URL } from '@/lib/config';
import { getPublicSiteConfig } from '@/lib/site-config';
import { ChatbotWidget } from '@/components/chatbot/chatbot-widget';

// Site config (branding, contact details, feature switches) is editable from
// the admin panel at runtime, so every page renders on demand instead of being
// frozen at build time. Server-side caches keep the per-request cost small.
export const dynamic = 'force-dynamic';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
});

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-open-sans',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const { config: site } = await getPublicSiteConfig();
  return {
    metadataBase: new URL(APP_URL),
    title: {
      default: `${site.siteName} - ${site.tagline}`,
      template: `%s - ${site.siteName}`,
    },
    description:
      'Book affordable and comfortable intercity trips across Ghana with real-time seat selection and secure digital payments. Mobile Money, Visa and Mastercard accepted.',
    applicationName: site.siteName,
    keywords: ['Ghana bus booking', 'intercity transport', 'SMG Transport', 'book bus Ghana', 'mobile money tickets'],
    authors: [{ name: site.siteName }],
    openGraph: {
      type: 'website',
      siteName: site.siteName,
      title: `${site.siteName} - ${site.tagline}`,
      description: 'Affordable, reliable and comfortable intercity travel across Ghana. Book in three simple steps.',
      url: APP_URL,
      images: [
        {
          url: '/brand/social-share.png',
          width: 1200,
          height: 630,
          alt: `${site.siteName} social preview`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${site.siteName} - ${site.tagline}`,
      description: 'Book intercity trips across Ghana with secure digital payments.',
      images: ['/brand/social-share.png'],
    },
    icons: {
      icon: [
        { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/brand/favicon-96.png', sizes: '96x96', type: 'image/png' },
      ],
      apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
      other: [
        { rel: 'icon', url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
        { rel: 'icon', url: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { config: site } = await getPublicSiteConfig();
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.siteName,
    url: APP_URL,
    description: 'Youth-driven intercity and intra-city transport company in Ghana.',
    email: site.supportEmail,
    telephone: site.supportPhone,
    address: site.companyAddress,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: site.supportPhone,
      contactType: 'customer support',
      availableLanguage: ['English'],
      hoursAvailable: site.supportHours,
    },
  };

  return (
    <html lang="en" className={`${montserrat.variable} ${openSans.variable}`}>
      <body className="flex min-h-screen flex-col bg-background">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <CustomerAuthProvider>
          <ChromeGate header={<SiteHeader />} footer={<SiteFooter />}>
            {children}
          </ChromeGate>
          <ChatbotWidget />
          <DemoBadge />
        </CustomerAuthProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </body>
    </html>
  );
}
