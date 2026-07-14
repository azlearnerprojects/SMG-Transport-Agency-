import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { getStaffSession, roleAllowed } from '@/lib/auth/session';
import { getPublicSiteConfig, updatePublicSiteConfig } from '@/lib/site-config';
import { publishRemoteConfigPatch, remoteConfigPatchFromSiteConfig } from '@/lib/remote-config';
import { summarizeProductionReadiness } from '@/lib/production-readiness';

/** GET /api/admin/config - read safe site config for authorized staff. */
export const GET = withErrorHandling(async () => {
  const session = await getStaffSession();
  if (!roleAllowed(session, ['operations_manager', 'finance_officer'])) {
    return jsonError('Not authorised.', 403);
  }

  const result = await getPublicSiteConfig();
  return jsonOk({
    ...result,
    readiness: summarizeProductionReadiness({
      siteConfig: result.config,
      siteConfigConfigured: result.configured,
    }),
  });
});

/** POST /api/admin/config - update safe public site config. */
export const POST = withErrorHandling(async (req: Request) => {
  const session = await getStaffSession();
  if (!roleAllowed(session, ['operations_manager', 'finance_officer'])) {
    return jsonError('Not authorised.', 403);
  }

  const body = await req.json();
  if (body.paymentGatewayMode === 'live' && session?.role !== 'super_admin') {
    return jsonError('Only a Super Admin can switch payments to live mode.', 403);
  }
  if ((body.maintenanceMode || body.bookingEnabled === false) && !body.confirmDangerousChange) {
    return jsonError('Confirm this high-impact configuration change before saving.', 409);
  }

  const previous = await getPublicSiteConfig();
  const result = await updatePublicSiteConfig(body, {
    uid: session?.uid ?? null,
    email: session!.email,
    previousValue: previous.config,
  });

  let remoteConfig: { published: boolean; reason?: string } = {
    published: false,
    reason: 'Remote Config publication was not requested.',
  };
  if (body.publishRemoteConfig === true) {
    remoteConfig = await publishRemoteConfigPatch(
      remoteConfigPatchFromSiteConfig(result.config),
      `Public SMG site config updated by ${session!.email}`,
    );
  }

  return jsonOk({
    ...result,
    remoteConfig,
    readiness: summarizeProductionReadiness({
      siteConfig: result.config,
      siteConfigConfigured: result.configured,
    }),
  });
});
