import { getAdminFirestore } from '@/lib/firebase/admin';

export interface AdminChatSessionSummary {
  id: string;
  uid?: string;
  anonymousId?: string;
  status: string;
  updatedAt: string;
  latestMessage: string;
}

function toIso(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object' && 'toDate' in value) {
    const date = (value as { toDate?: () => Date }).toDate?.();
    if (date) return date.toISOString();
  }
  return new Date().toISOString();
}

export async function listRecentChatSessions(limit = 12): Promise<{ configured: boolean; sessions: AdminChatSessionSummary[] }> {
  const firestore = await getAdminFirestore();
  if (!firestore) return { configured: false, sessions: [] };

  const snapshot = await firestore.collection('chatSessions').orderBy('updatedAt', 'desc').limit(limit).get();
  const sessions = await Promise.all(
    snapshot.docs.map(async (doc) => {
      const data = doc.data();
      const messages = await doc.ref.collection('messages').orderBy('createdAt', 'desc').limit(1).get();
      return {
        id: doc.id,
        uid: typeof data.uid === 'string' ? data.uid : undefined,
        anonymousId: typeof data.anonymousId === 'string' ? data.anonymousId : undefined,
        status: typeof data.status === 'string' ? data.status : 'open',
        updatedAt: toIso(data.updatedAt),
        latestMessage: messages.docs[0]?.get('content') ?? 'No messages yet.',
      };
    }),
  );

  return { configured: true, sessions };
}

export async function countChatSessions(): Promise<{ configured: boolean; count: number }> {
  const firestore = await getAdminFirestore();
  if (!firestore) return { configured: false, count: 0 };
  const snapshot = await firestore.collection('chatSessions').count().get();
  return { configured: true, count: snapshot.data().count };
}
