import { z } from 'zod';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { getAdminAuth } from '@/lib/firebase/admin';
import { askLocalChatbot } from '@/lib/chatbot/server';
import { clientIp, rateLimit } from '@/lib/rate-limit';

const schema = z.object({
  message: z.string().trim().min(1).max(1200),
  sessionId: z.string().trim().max(80).optional(),
  anonymousId: z.string().trim().max(120).optional(),
});

async function authUid(req: Request): Promise<string | undefined> {
  const header = req.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return undefined;
  const auth = await getAdminAuth();
  if (!auth) return undefined;
  const decoded = await auth.verifyIdToken(token).catch(() => null);
  return decoded?.uid;
}

/** POST /api/chatbot/ask - local/demo backend fallback for the chatbot widget. */
export const POST = withErrorHandling(async (req: Request) => {
  const body = schema.parse(await req.json());
  const uid = await authUid(req);
  const key = `chatbot:${uid ?? body.anonymousId ?? clientIp(req)}`;
  const limit = rateLimit(key, 12, 60);
  if (!limit.allowed) {
    return jsonError('Too many chat messages. Please wait a moment and try again.', 429, {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  const result = await askLocalChatbot({ ...body, uid });
  return jsonOk(result);
});
