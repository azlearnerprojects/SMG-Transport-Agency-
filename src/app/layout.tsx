import type { Metadata, Viewport } from 'next';
import { Montserrat, Open_Sans } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { ChromeGate } from '@/components/layout/chrome-gate';
import { DemoBadge } from '@/components/layout/demo-badge';
import { CustomerAuthProvider } from '@/lib/auth/customer-auth';
import { getPublicSiteConfig } from '@/lib/site-config';
import { ChatbotWidget } from '@/components/chatbot/chatbot-widget';
import {
  CANONICAL_SITE_URL,
  DEFAULT_OG_IMAGE,
  HOME_SEO_DESCRIPTION,
  HOME_SEO_TITLE,
  SEO_KEYWORDS,
  absoluteUrl,
  buildSeoMetadata,
} from '@/lib/seo';

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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#003366',
  colorScheme: 'light',
};

export async function generateMetadata(): Promise<Metadata> {
  const { config: site } = await getPublicSiteConfig();
  const homeMetadata = buildSeoMetadata({
    title: HOME_SEO_TITLE,
    description: HOME_SEO_DESCRIPTION,
    path: '/',
  });

  return {
    ...homeMetadata,
    metadataBase: new URL(CANONICAL_SITE_URL),
    title: {
      default: HOME_SEO_TITLE,
      template: `%s | ${site.siteName}`,
    },
    description: HOME_SEO_DESCRIPTION,
    applicationName: site.siteName,
    keywords: SEO_KEYWORDS,
    authors: [{ name: site.siteName }],
    creator: site.siteName,
    publisher: site.siteName,
    category: 'travel',
    openGraph: {
      ...homeMetadata.openGraph,
      type: 'website',
      siteName: site.siteName,
      title: HOME_SEO_TITLE,
      description: HOME_SEO_DESCRIPTION,
      url: absoluteUrl('/'),
      images: [
        {
          url: absoluteUrl(DEFAULT_OG_IMAGE),
          width: 1200,
          height: 630,
          alt: `${site.siteName} social preview`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: HOME_SEO_TITLE,
      description: HOME_SEO_DESCRIPTION,
      images: [absoluteUrl(DEFAULT_OG_IMAGE)],
    },
    alternates: {
      canonical: absoluteUrl('/'),
    },
    manifest: '/manifest.webmanifest',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
      </body>
    </html>
  );
}
