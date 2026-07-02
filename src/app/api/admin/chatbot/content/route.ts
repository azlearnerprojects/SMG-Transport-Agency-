import { z } from 'zod';
import { jsonError, jsonOk, withErrorHandling } from '@/lib/api';
import { getStaffSession, roleAllowed } from '@/lib/auth/session';
import { getAdminFirestore } from '@/lib/firebase/admin';

const schema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('faq'),
    question: z.string().trim().min(6).max(240),
    answer: z.string().trim().min(10).max(1600),
    category: z.string().trim().min(2).max(80),
  }),
  z.object({
    type: z.literal('policy'),
    title: z.string().trim().min(4).max(160),
    body: z.string().trim().min(10).max(2200),
    category: z.string().trim().min(2).max(80),
  }),
]);

/** POST /api/admin/chatbot/content - add FAQ/policy knowledge entries. */
export const POST = withErrorHandling(async (req: Request) => {
  const session = await getStaffSession();
  if (!roleAllowed(session, ['customer_support', 'content_editor']) || session?.role === 'support_agent') {
    return jsonError('Not authorised.', 403);
  }

  const firestore = await getAdminFirestore();
  if (!firestore) return jsonError('Firebase Admin SDK is not configured on this server.', 503);

  const body = schema.parse(await req.json());
  const now = new Date().toISOString();

  if (body.type === 'faq') {
    const ref = await firestore.collection('faqs').add({
      question: body.question,
      answer: body.answer,
      category: body.category,
      active: true,
      published: true,
      createdAt: now,
      updatedAt: now,
    });
    await firestore.collection('auditLogs').add({
      action: 'create_chatbot_faq',
      performedByUid: session?.uid ?? null,
      performedByEmail: session!.email,
      targetType: 'faqs',
      targetId: ref.id,
      previousValue: null,
      newValue: body,
      createdAt: now,
    });
    return jsonOk({ id: ref.id });
  }

  const ref = await firestore.collection('policies').add({
    title: body.title,
    body: body.body,
    category: body.category,
    active: true,
    createdAt: now,
    updatedAt: now,
  });
  await firestore.collection('auditLogs').add({
    action: 'create_chatbot_policy',
    performedByUid: session?.uid ?? null,
    performedByEmail: session!.email,
    targetType: 'policies',
    targetId: ref.id,
    previousValue: null,
    newValue: body,
    createdAt: now,
  });
  return jsonOk({ id: ref.id });
});
