import type { Metadata } from 'next';
import { Montserrat, Open_Sans } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { ChromeGate } from '@/components/layout/chrome-gate';
import { DemoBadge } from '@/components/layout/demo-badge';
import { CustomerAuthProvider } from '@/lib/auth/customer-auth';
import { APP_URL, BRAND } from '@/lib/config';

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

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description:
    'Book affordable and comfortable intercity trips across Ghana with real-time seat selection and secure digital payments. Mobile Money, Visa and Mastercard accepted.',
  applicationName: BRAND.name,
  keywords: ['Ghana bus booking', 'intercity transport', 'SMG Transport', 'book bus Ghana', 'mobile money tickets'],
  authors: [{ name: BRAND.name }],
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: 'Affordable, reliable and comfortable intercity travel across Ghana. Book in three simple steps.',
    url: APP_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: 'Book intercity trips across Ghana with secure digital payments.',
  },
  robots: { index: true, follow: true },
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: BRAND.name,
  url: APP_URL,
  description: 'Youth-driven intercity and intra-city transport company in Ghana.',
  // Contact details are placeholders pending CEO approval.
  email: BRAND.email,
};

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
