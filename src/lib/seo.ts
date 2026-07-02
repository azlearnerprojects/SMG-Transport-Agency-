import type { Metadata, MetadataRoute } from 'next';
import type { PublicSiteConfig } from './types';
import { BRAND } from './config';

export const CANONICAL_SITE_URL = 'https://smgagencygh.com';
export const DEFAULT_OG_IMAGE = '/brand/social-share.png';
export const LOGO_IMAGE = '/brand/smg-logo.png';

export const HOME_SEO_TITLE = 'SMG Transport Agency | Affordable Bus Booking in Ghana';
export const HOME_SEO_DESCRIPTION =
  'Book affordable and reliable bus trips across Ghana with SMG Transport Agency. Find routes, select seats, view schedules, and travel with confidence.';

export const SEO_KEYWORDS = [
  'SMG Transport Agency',
  'bus booking Ghana',
  'transport agency Ghana',
  'affordable bus tickets Ghana',
  'student transport Ghana',
  'intercity transport Ghana',
  'online bus ticket booking Ghana',
  'UCC transport booking',
  'Ghana travel agency',
  'reliable bus services Ghana',
];

export type PublicSitemapRoute = {
  path: string;
  title: string;
  description: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
};

export const PUBLIC_SITEMAP_ROUTES: PublicSitemapRoute[] = [
  {
    path: '/',
    title: HOME_SEO_TITLE,
    description: HOME_SEO_DESCRIPTION,
    changeFrequency: 'daily',
    priority: 1,
  },
  {
    path: '/book',
    title: 'Book a Bus Trip in Ghana | SMG Transport Agency',
    description: 'Search SMG bus departures, compare fares, choose seats, and book intercity trips across Ghana online.',
    changeFrequency: 'daily',
    priority: 0.9,
  },
  {
    path: '/routes',
    title: 'Bus Routes & Schedules in Ghana | SMG Transport Agency',
    description: 'Browse SMG Transport Agency routes, schedules, departure times, fares, and popular intercity trips in Ghana.',
    changeFrequency: 'daily',
    priority: 0.85,
  },
  {
    path: '/fleet',
    title: 'SMG Bus Fleet | Comfortable Intercity Coaches in Ghana',
    description: 'Explore SMG Transport Agency coaches, amenities, and Standard, Business, and VIP travel options.',
    changeFrequency: 'monthly',
    priority: 0.65,
  },
  {
    path: '/promotions',
    title: 'Bus Ticket Promotions in Ghana | SMG Transport Agency',
    description: 'Find current SMG Transport Agency travel offers, discounts, and promo codes for affordable Ghana bus trips.',
    changeFrequency: 'weekly',
    priority: 0.65,
  },
  {
    path: '/about',
    title: 'About SMG Transport Agency | Youth-Driven Ghana Transport',
    description: 'Learn about SMG Transport Agency, a youth-driven Ghanaian transport company focused on affordable and reliable travel.',
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    path: '/faq',
    title: 'SMG Transport Agency FAQs | Booking, Payments & Travel Help',
    description: 'Get answers about SMG bus booking, online payments, e-tickets, cancellations, rescheduling, and travel support.',
    changeFrequency: 'weekly',
    priority: 0.65,
  },
  {
    path: '/contact',
    title: 'Contact SMG Transport Agency | Ghana Bus Booking Support',
    description: 'Contact SMG Transport Agency for help with bookings, route questions, payments, cancellations, and travel support.',
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    path: '/support/chat',
    title: 'SMG Support Chat | Booking and Travel Help',
    description: 'Chat with SMG Transport Agency support for booking, route, payment, cancellation, and rescheduling help.',
    changeFrequency: 'weekly',
    priority: 0.55,
  },
  {
    path: '/policies/travel',
    title: 'Travel Policies | SMG Transport Agency',
    description: 'Read SMG Transport Agency travel, boarding, luggage, ticket, and passenger conduct policies.',
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    path: '/policies/cancellation',
    title: 'Cancellation & Refund Policy | SMG Transport Agency',
    description: 'Understand SMG Transport Agency cancellation, refund, rescheduling, missed trip, and fare policy rules.',
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    path: '/terms',
    title: 'Terms & Conditions | SMG Transport Agency',
    description: 'Review the terms that govern use of the SMG Transport Agency website and online bus booking platform.',
    changeFrequency: 'yearly',
    priority: 0.4,
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | SMG Transport Agency',
    description: 'Learn how SMG Transport Agency collects, uses, protects, and shares booking and customer information.',
    changeFrequency: 'yearly',
    priority: 0.4,
  },
];

export const NOINDEX_ROBOTS: Metadata['robots'] = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
};

export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${CANONICAL_SITE_URL}${normalizedPath}`;
}

export function buildSeoMetadata({
  title,
  description,
  path,
  robots,
}: {
  title: string;
  description: string;
  path: string;
  robots?: Metadata['robots'];
}): Metadata {
  const canonical = absoluteUrl(path);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'website',
      siteName: BRAND.name,
      title,
      description,
      url: canonical,
      images: [
        {
          url: absoluteUrl(DEFAULT_OG_IMAGE),
          width: 1200,
          height: 630,
          alt: `${BRAND.name} social preview`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [absoluteUrl(DEFAULT_OG_IMAGE)],
    },
    robots: robots ?? { index: true, follow: true },
  };
}

export function buildNoIndexMetadata(title: string, description?: string): Metadata {
  return {
    title: { absolute: `${title} | ${BRAND.name}` },
    ...(description ? { description } : {}),
    robots: NOINDEX_ROBOTS,
  };
}

export function buildRouteMetadata(path: string): Metadata {
  const route = PUBLIC_SITEMAP_ROUTES.find((entry) => entry.path === path);
  if (!route) {
    throw new Error(`Missing SEO route config for ${path}`);
  }
  return buildSeoMetadata({
    title: route.title,
    description: route.description,
    path: route.path,
  });
}

function stripEmpty<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === undefined || entry === null || entry === '') return false;
      if (Array.isArray(entry)) return entry.length > 0;
      return true;
    }),
  ) as T;
}

export function buildHomeStructuredData(site: PublicSiteConfig) {
  const sameAs = [
    site.socialFacebook,
    site.socialInstagram,
    site.socialTwitter,
    site.socialTiktok,
  ].filter(Boolean);

  const postalAddress = stripEmpty({
    '@type': 'PostalAddress',
    streetAddress: site.companyAddress,
    addressCountry: 'GH',
  });

  const contactPoint = stripEmpty({
    '@type': 'ContactPoint',
    telephone: site.supportPhone,
    contactType: 'customer support',
    email: site.supportEmail,
    availableLanguage: ['English'],
    areaServed: 'GH',
  });

  const organization = stripEmpty({
    '@type': 'Organization',
    '@id': `${CANONICAL_SITE_URL}/#organization`,
    name: site.siteName,
    url: CANONICAL_SITE_URL,
    logo: absoluteUrl(LOGO_IMAGE),
    image: absoluteUrl(DEFAULT_OG_IMAGE),
    description: HOME_SEO_DESCRIPTION,
    email: site.supportEmail,
    telephone: site.supportPhone,
    address: postalAddress,
    contactPoint,
    sameAs,
  });

  const travelAgency = stripEmpty({
    '@type': ['LocalBusiness', 'TravelAgency'],
    '@id': `${CANONICAL_SITE_URL}/#business`,
    name: site.siteName,
    url: CANONICAL_SITE_URL,
    image: absoluteUrl(DEFAULT_OG_IMAGE),
    description: HOME_SEO_DESCRIPTION,
    priceRange: 'GHS',
    address: postalAddress,
    telephone: site.supportPhone,
    email: site.supportEmail,
    areaServed: {
      '@type': 'Country',
      name: 'Ghana',
    },
    serviceArea: {
      '@type': 'Country',
      name: 'Ghana',
    },
    parentOrganization: {
      '@id': `${CANONICAL_SITE_URL}/#organization`,
    },
  });

  const website = stripEmpty({
    '@type': 'WebSite',
    '@id': `${CANONICAL_SITE_URL}/#website`,
    name: site.siteName,
    url: CANONICAL_SITE_URL,
    description: HOME_SEO_DESCRIPTION,
    publisher: {
      '@id': `${CANONICAL_SITE_URL}/#organization`,
    },
    inLanguage: 'en',
  });

  return {
    '@context': 'https://schema.org',
    '@graph': [organization, travelAgency, website],
  };
}
