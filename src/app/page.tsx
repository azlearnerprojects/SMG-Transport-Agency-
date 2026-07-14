import { getDb } from '@/lib/db';
import { getPublicSiteConfig } from '@/lib/site-config';
import { buildHomeStructuredData, serializeJsonLd } from '@/lib/seo';
import { buildHomeRoutes } from '@/lib/home-data';
import { HeroSection } from '@/components/home/hero-section';
import { AdminAccessNotice } from '@/components/home/admin-access-notice';
import { ActiveRoutesSection } from '@/components/home/active-routes-section';
import { TrustStrip } from '@/components/home/trust-strip';

export default async function HomePage() {
  const db = getDb();
  const [cities, routes, schedules, { config: site }] = await Promise.all([
    db.getCities(),
    db.listRoutes(),
    db.listSchedules(),
    getPublicSiteConfig(),
  ]);

  const homeRoutes = buildHomeRoutes(routes, schedules, site.featuredRoutes);
  const jsonLd = serializeJsonLd(buildHomeStructuredData(site));

  return (
    <>
      <HeroSection site={site} cities={cities} />
      <AdminAccessNotice />
      <ActiveRoutesSection initialRoutes={homeRoutes} />
      <TrustStrip />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </>
  );
}
