import { jsonOk, withErrorHandling } from '@/lib/api';
import { attachClearStaffSessionCookie } from '@/lib/auth/session';

export const POST = withErrorHandling(async () => {
  return attachClearStaffSessionCookie(jsonOk({ loggedOut: true }));
});
