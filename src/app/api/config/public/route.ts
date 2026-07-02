import { jsonOk, withErrorHandling } from '@/lib/api';
import { getPublicSiteConfig } from '@/lib/site-config';

/** GET /api/config/public - safe runtime settings for the browser. */
export const GET = withErrorHandling(async () => {
  const result = await getPublicSiteConfig();
  return jsonOk(result);
});
