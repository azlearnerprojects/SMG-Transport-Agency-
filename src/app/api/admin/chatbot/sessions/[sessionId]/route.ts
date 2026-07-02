import { z } from 'zod';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { getStaffSession, roleAllowed } from '@/lib/auth/session';
import { getAdminFirestore } from '@/lib/firebase/admin';

const schema = z.object({
  status: z.enum(['open', 'resolved', 'escalated']),
});

/** PATCH /api/admin/chatbot/sessions/[sessionId] - update support conversation status. */
export const PATCH = withErrorHandling(
  async (req: Request, ctx: { params: Promise<{ sessionId: string }> }) => {
    const session = await getStaffSession();
    if (!roleAllowed(session, ['customer_support', 'support_agent'])) {
      return jsonError('Not authorised.', 403);
    }

    const firestore = await getAdminFirestore();
    if (!firestore) return jsonError('Firebase Admin SDK is not configured on this server.', 503);

    const { sessionId } = await ctx.params;
    const body = schema.parse(await req.json());
    const now = new Date().toISOString();
    await firestore.collection('chatSessions').doc(sessionId).set(
      {
        status: body.status,
        updatedAt: now,
        resolvedBy: body.status === 'resolved' ? session?.email : null,
      },
      { merge: true },
    );
    await firestore.collection('auditLogs').add({
      action: 'update_chat_session_status',
      performedByUid: session?.uid ?? null,
      performedByEmail: session!.email,
      targetType: 'chatSessions',
      targetId: sessionId,
      previousValue: null,
      newValue: { status: body.status },
      createdAt: now,
    });

    return jsonOk({ sessionId, status: body.status });
  },
);
