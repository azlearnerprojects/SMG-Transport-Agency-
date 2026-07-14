import type { MetadataRoute } from 'next';
import { CANONICAL_SITE_URL } from '@/lib/seo';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private/transactional areas should not be indexed.
        disallow: [
          '/admin',
          '/admin/',
          '/profile',
          '/dashboard',
          '/dashboard/',
          '/api/',
          '/ticket',
          '/ticket/',
          '/booking',
          '/booking/',
          '/book/',
          '/book/review',
          '/book/review/',
          '/payment',
          '/payment/',
          '/manage',
          '/verify',
          '/login',
          '/register',
          '/access-denied',
        ],
      },
    ],
    sitemap: `${CANONICAL_SITE_URL}/sitemap.xml`,
  };
}
