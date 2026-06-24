import type { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/config';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/book',
    '/routes',
    '/fleet',
    '/promotions',
    '/about',
    '/faq',
    '/contact',
    '/manage',
    '/login',
    '/register',
    '/policies/travel',
    '/policies/cancellation',
    '/terms',
    '/privacy',
  ];
  const now = new Date();
  return routes.map((path) => ({
    url: `${APP_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : path === '/book' ? 0.9 : 0.6,
  }));
}
