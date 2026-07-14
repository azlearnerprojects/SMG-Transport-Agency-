import { getDb } from '@/lib/db';
import { jsonOk, withErrorHandling } from '@/lib/api';
import { getPublicSiteConfig } from '@/lib/site-config';
import { buildHomeRoutes } from '@/lib/home-data';

export const dynamic = 'force-dynamic';

/**
 * GET /api/routes — public list of active routes for the homepage.
 * Mirrors the server-rendered homepage exactly so the client Active Routes
 * section can retry/refresh without a full page reload.
 */
export const GET = withErrorHandling(async () => {
  const db = getDb();
  const [routes, schedules, { config }] = await Promise.all([
    db.listRoutes(),
    db.listSchedules(),
    getPublicSiteConfig(),
  ]);

  const homeRoutes = buildHomeRoutes(routes, schedules, config.featuredRoutes);
  return jsonOk({ routes: homeRoutes });
});
