import type { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/config';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Private/transactional areas should not be indexed.
        disallow: ['/admin', '/dashboard', '/api', '/ticket', '/booking', '/payment'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
