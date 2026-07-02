import type { MetadataRoute } from 'next';
import { CANONICAL_SITE_URL, PUBLIC_SITEMAP_ROUTES } from '@/lib/seo';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_SITEMAP_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${CANONICAL_SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
