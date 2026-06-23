import { jsonOk, withErrorHandling } from '@/lib/api';
import { clearStaffSession } from '@/lib/auth/session';

export const POST = withErrorHandling(async () => {
  await clearStaffSession();
  return jsonOk({ loggedOut: true });
});
